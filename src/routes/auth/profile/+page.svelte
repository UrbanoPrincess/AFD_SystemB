<script lang="ts">
    import { onMount } from "svelte";
    import { getFirestore, setDoc, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
    import { firebaseConfig } from "$lib/firebaseConfig";
    import { initializeApp, getApps, getApp } from "firebase/app";
    import { getAuth, onAuthStateChanged } from "firebase/auth";
    import type { User } from "firebase/auth";
    import Swal from 'sweetalert2';

    // Firebase setup
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);

    // State for form inputs and data display
    let formPatientName = "";
    let formLastName = "";
    let formAge = "";
    let formGender = "";
    let formEmail = "";
    let formPhone = "";
    let phoneError = "";
    let formHomeAddress = "";
    let formBirthday="";
    let isPrescriptionDropdownOpen = true;
    let prescriptions: any[] = [];


    // Define the type for patientProfile
    type PatientProfile = {
        name: string;
        lastName: string;
        id: string;
        age: string;
        gender: string;
        email: string;
        phone: string;
        address: string;
        birthday:string;
    };

    // Initialize patientProfile with default values
    let patientProfile: PatientProfile = {
        name: '',
        lastName: '',
        id: '',
        age: '',
        gender: '',
        email: '',
        phone: '',
        address: '',
        birthday:''
    };

    let currentUser: User | null = null;
    let isEditingProfile = false; // Toggle for edit profile
    let doneAppointments: any[] = [];
    let isDropdownOpen = true;

 // Monitor auth state changes
onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser  = user;
            console.log("User  is logged in: ", currentUser );

            try {
                // Fetch user profile from Firestore
                const patientRef = doc(db, "patientProfiles", currentUser .uid);
                const patientDoc = await getDoc(patientRef);

                if (patientDoc.exists()) {
                    patientProfile = patientDoc.data() as PatientProfile;
                    // Ensure the ID is numeric
                    patientProfile.id = patientProfile.id.replace(/\D/g, ''); // Keep only numbers
                    console.log("Loaded patient profile from Firestore: ", patientProfile);
                } else {
                    console.log("No profile found for this user. Using default values.");
                    patientProfile = {
                        name: '',
                        lastName: '',
                        id: currentUser .uid.replace(/\D/g, ''), // Keep only numbers
                        age: '',
                        gender: '',
                        email: '',
                        phone: '',
                        address: '',
                        birthday: ''
                    };
                }

                // Get appointments where status is "Completed"
                const appointmentsRef = collection(db, "appointments");
                const qAppointments = query(
                    appointmentsRef,
                    where("patientId", "==", currentUser.uid),
                    where("status", "==", "Completed")
                );
                const querySnapshot = await getDocs(qAppointments);
                doneAppointments = querySnapshot.docs.map((doc) => ({
                    ...doc.data(),
                    id: doc.id // Ensure each appointment includes its Firestore document ID
                }));
                console.log("Loaded done appointments: ", doneAppointments); // Debugging log

                // Check if appointmentId exists before proceeding
                const appointmentIds = doneAppointments
                    .filter(appointment => appointment.id) // Filter out appointments without an id
                    .map(appointment => appointment.id);

                if (appointmentIds.length > 0) {
                    const prescriptionsRef = collection(db, "prescriptions");
                    const qPrescriptions = query(
                        prescriptionsRef,
                        where("appointmentId", "in", appointmentIds) // Filter by appointmentId
                    );
                    const prescriptionsSnapshot = await getDocs(qPrescriptions);
                    prescriptions = prescriptionsSnapshot.docs.map(doc => doc.data());
                    console.log("Loaded prescriptions: ", prescriptions);
                } else {
                    console.log("No valid appointment IDs found.");
                }

            } catch (error) {
                console.error("Error loading data: ", error);
            }
        } else {
            currentUser = null;
            patientProfile = {
                name: '',
                lastName: '',
                id: '',
                age: '',
                gender: '',
                email: '',
                phone: '',
                address: '',
                birthday:''
            };
            doneAppointments = [];
            prescriptions = [];
            console.log("User is not logged in.");
        }
    });

    return () => unsubscribe();
});

 function validatePhoneNumber() {
        const phoneRegex = /^09\d{9}$/; // Philippine phone number format
        if (!phoneRegex.test(formPhone)) {
        } else {
            phoneError = ""; // Clear the error if valid
        }
    }
    
function calculateAge(birthday: string) {
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDifference = today.getMonth() - birthDate.getMonth();
        if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    function updateAge(event: Event) {
        const target = event.target as HTMLInputElement;
        formBirthday = target.value;
        formAge = calculateAge(formBirthday).toString(); // Update formAge based on birthday
    }

// Save patient profile to Firestore
async function savePatientProfile() {
    if (!currentUser) {
        Swal.fire({
            icon: 'error',
            title: 'Not Logged In',
            text: 'Please log in to save the profile.'
        });
        console.log("Please log in to save the profile.");
        return;
    }
    if (!formPatientName || !formAge || !formEmail || !formPhone || !formBirthday) {
        Swal.fire({
            icon: 'warning',
            title: 'Incomplete Form',
            text: 'Please fill out all required fields.'
        });
        console.error("Please fill out all required fields.");
        return;
    }

    try {
        // Reference to the collection "patientProfiles"
        const patientRef = doc(db, "patientProfiles", currentUser.uid);

        await setDoc(patientRef, {
            name: formPatientName,
            lastName: formLastName,
            age: formAge,
            birthday: formBirthday, // Added birthday
            gender: formGender,
            email: formEmail,
            phone: formPhone,
            address: formHomeAddress,
            id: currentUser.uid
        });
        // Display success message
        Swal.fire({
            icon: 'success',
            title: 'Profile Saved',
            text: 'Profile updated successfully.'
        });
        console.log("Patient profile saved/updated successfully.");

        // Update local state
        patientProfile = {
            name: formPatientName,
            lastName: formLastName,
            age: formAge,
            birthday: formBirthday, // Added birthday
            gender: formGender,
            email: formEmail,
            phone: formPhone,
            address: formHomeAddress,
            id: currentUser.uid
        };

        // Close the editing form
        isEditingProfile = false;
    } catch (error) {
        // Display error message
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Error saving patient profile.`
        });
        console.error("Error saving patient profile: ", error);
    }
}

// Toggle edit profile
function toggleEditProfile() {
    isEditingProfile = !isEditingProfile; // Toggle edit state

    if (isEditingProfile) {
        // Initialize form fields with existing profile data when editing starts
        formPatientName = patientProfile.name;
        formLastName = patientProfile.lastName;
        formAge = patientProfile.age;
        formBirthday = patientProfile.birthday; // Added birthday
        formGender = patientProfile.gender;
        formEmail = patientProfile.email;
        formPhone = patientProfile.phone;
        formHomeAddress = patientProfile.address;
    } else {
        // Reset form fields when editing is canceled
        formPatientName = "";
        formLastName = "";
        formAge = "";
        formBirthday = ""; // Reset birthday
        formGender = "";
        formEmail = "";
        formPhone = "";
        formHomeAddress = "";
    }
}

    // Toggle prescription history dropdown
    function togglePrescriptionDropdown() {
        isPrescriptionDropdownOpen = !isPrescriptionDropdownOpen;
    }

    // Toggle past visits dropdown
    function toggleDropdown(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement; }) {
        isDropdownOpen = !isDropdownOpen;  // Toggle dropdown visibility
    }
</script>
<div class="main-container">
    <!-- ========== Patient Card ========== -->
    <div class="patient-card">
        <img src="/images/logo(landing) copy.png" alt="Clinic Logo" class="logo"/>
        <div class="patient-info">
            <h1>{`${patientProfile.name} ${patientProfile.lastName}` || "<Patient Name>"}</h1>
            <div class="info-grid">
                 <p><strong>Patient ID:</strong> {patientProfile.id || "N/A"}</p>
                 <p><strong>Age:</strong> {patientProfile.age != null ? patientProfile.age : "N/A"}</p>
                 <p><strong>Gender:</strong> {patientProfile.gender || "N/A"}</p>
                 <p><strong>Phone:</strong> {patientProfile.phone || "N/A"}</p>
                 <p><strong>Email:</strong> {patientProfile.email || "N/A"}</p>
                 <p class="address"><strong>Address:</strong> {patientProfile.address || "N/A"}</p>
            </div>
        </div>
    </div>

    <!-- ========== Edit Profile Section ========== -->
    <div class="edit-profile-section">
        <button on:click={toggleEditProfile} class="edit-button">
            <span class="icon">
                <!-- Using simple +/- icons for expand/collapse feel -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="icon-edit">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                 {isEditingProfile ? 'Close Form' : 'Update Profile'}
            </span>

        </button>

        {#if isEditingProfile}
            <div class="profile-form-container slide-down">
                 <h3 class="form-title">Edit Patient Information</h3>
                <form class="profile-form" on:submit|preventDefault={savePatientProfile}>
                    <div class="input-grid">
                        <div class="form-group">
                            <label for="first-name">First Name</label>
                            <input id="first-name" type="text" bind:value={formPatientName} required />
                        </div>
                        <div class="form-group">
                            <label for="last-name">Last Name</label>
                            <input id="last-name" type="text" bind:value={formLastName} required />
                        </div>
                        <div class="form-group">
                            <label for="phone">Phone Number</label>
                            <input 
                                id="phone" 
                                type="tel" 
                                placeholder="e.g., 09123456789" 
                                bind:value={formPhone} 
                                on:blur={validatePhoneNumber} 
                                required 
                            />
                            {#if phoneError}
                                <p class="error-message">{phoneError}</p>
                            {/if}
                        </div>
                        <div class="form-group">
                            <label for="email">E-Mail Address</label>
                            <input id="email" type="email" bind:value={formEmail} />
                        </div>
                         <div class="form-group full-width"> 
                            <label for="home-address">Home Address</label>
                            <input id="home-address" type="text" bind:value={formHomeAddress} />
                        </div>
                        <div class="form-group">
                            <label for="birthday">Birth Date</label>
                            <input id="birthday" type="date" bind:value={formBirthday} on:input={updateAge} />
                        </div>
                         <div class="form-group">
                            <label for="age">Age</label>
                            <!-- Changed readonly to disabled for clearer visual cue -->
                            <input id="age" type="number" bind:value={formAge} disabled />
                        </div>
                        <div class="form-group">
                            <label for="gender">Gender</label>
                            <select id="gender" bind:value={formGender}>
                                <option value="" disabled>Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                                 <option value="prefer_not_to_say">Prefer not to say</option>
                            </select>
                        </div>

                    </div>
                    <div class="save-button-container">
                        <button type="submit" class="save-button">Save Changes</button>
                         <button type="button" on:click={toggleEditProfile} class="cancel-button">Cancel</button>
                    </div>
                </form>
            </div>
        {/if}
    </div>

    <!-- ========== History Section ========== -->
    <div class="history-section">
        <h2 class="section-title">
            Appointment & Prescription History
        </h2>
        {#if doneAppointments.length === 0}
            <p class="no-data-message">No past visits recorded.</p>
        {:else}
        <div class="card-container">
            {#each doneAppointments as appointment (appointment.id)}
                <div class="history-card">
                    <div class="card-header">
                         Appointment Details
                    </div>
                    <div class="card-content">
                         <p><strong>Date & Time:</strong> {appointment.date} at {appointment.time}</p>
                         <p><strong>Service:</strong> {appointment.service} <span class="status">({appointment.status})</span></p>

                         {#if appointment.remarks}
                            <p class="remarks"><strong>Remarks:</strong> {appointment.remarks}</p>
                         {:else}
                            <p class="no-info"><em>No remarks for this visit.</em></p>
                         {/if}

                         <hr class="divider" />

                         <p class="sub-header"><strong>Prescription:</strong></p>
                         {#if prescriptions && prescriptions.filter(p => p.appointmentId === appointment.id).length > 0}
                            {#each prescriptions.filter(p => p.appointmentId === appointment.id) as prescription}
                                <div class="prescription-details">
                                     {#each prescription.medicines as med (med.medicine)}
                                        <div class="medicine-item">
                                            <p><strong>Med:</strong> {med.medicine}</p>
                                            <p><strong>Instructions:</strong> {med.instructions}</p>
                                            <p><strong>Qty/Refills:</strong> {med.dosage}</p>
                                        </div>
                                     {/each}
                                    <p class="prescriber"><strong>Prescriber:</strong> {prescription.prescriber || "N/A"}</p>
                                </div>
                            {/each}
                         {:else}
                            <p class="no-info"><em>No prescription issued for this visit.</em></p>
                         {/if}
                    </div>
                </div>
            {/each}
        </div>
        {/if}
    </div>
</div>
<style>
    :root {
        --primary-color: #6681e2;
        --secondary-color: #172f85;
        --accent-color: #eaee00;
        --light-gray: #f8f9fa;
        --medium-gray: #e9ecef;
        --dark-gray: #6c757d;
        --text-color: #343a40;
        --white: #ffffff;
        --danger-color: #dc3545;
        --success-color: #28a745;
        --border-radius: 8px;
        --card-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        --input-border-color: #ced4da;
    }

    /* Apply basic font and background to the whole page */
    body {
        font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background-color: var(--light-gray); /* Background for the area outside the main container */
        margin: 0; /* Remove default body margin */
        padding: 0; /* Remove default body padding */
        /* If you want to style the main browser scrollbar (optional) */
        /* scrollbar-width: thin; */
        /* scrollbar-color: var(--dark-gray) var(--medium-gray); */
    }
    /* Style for the main browser scrollbar (optional) */
    /* body::-webkit-scrollbar {
        width: 8px;
    }
    body::-webkit-scrollbar-track {
        background: var(--medium-gray);
    }
    body::-webkit-scrollbar-thumb {
        background-color: var(--dark-gray);
        border-radius: 4px;
        border: 2px solid var(--medium-gray);
    } */


   .main-container {
        max-width: 1200px;
        margin: 20px auto; /* Add top/bottom margin for spacing, auto for centering */
        padding: 20px;
        /* REMOVED: height: calc(100vh - 80px); */
        /* REMOVED: overflow-y: auto; */
        /* MIN-HEIGHT (Optional): Ensure it takes at least viewport height if needed,
           but generally not required if you want natural flow */
        /* min-height: calc(100vh - 40px); /* Adjust based on header/footer height if any */
         background-color: var(--white);
         border-radius: var(--border-radius);
         box-shadow: 0 2px 10px rgba(0,0,0,0.05);
         /* Removed scrollbar styles specific to this container */
    }

    /* Keep all other styles for patient-card, edit-profile-section, history-section, etc. the same */

    .patient-card {
        background: linear-gradient(120deg, var(--primary-color), var(--secondary-color));
        color: var(--white);
        border-radius: var(--border-radius);
        padding: 24px;
        display: flex;
        align-items: flex-start;
        box-shadow: var(--card-shadow);
        margin-bottom: 24px;
        gap: 24px;
    }

    .patient-card .logo {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid var(--white);
        flex-shrink: 0;
    }

    .patient-info {
        flex-grow: 1;
        min-width: 0;
    }

    .patient-info h1 {
        font-size: 1.8rem;
        font-weight: 600;
        margin-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        padding-bottom: 8px;
        word-break: break-word;
    }

    .patient-info .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 8px 16px;
        font-size: 0.95rem;
        line-height: 1.5;
    }

    .patient-info p {
        margin-bottom: 0;
        color: rgba(255, 255, 255, 0.9);
    }

    .patient-info p strong {
        font-weight: 500;
        color: var(--white);
        margin-right: 5px;
    }
     .patient-info .address {
        grid-column: 1 / -1;
    }

    @media (max-width: 768px) {
        .patient-card {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 16px;
            gap: 16px;
        }
         .patient-card .logo {
            width: 80px;
            height: 80px;
            margin-bottom: 10px;
        }
        .patient-info h1 {
            font-size: 1.5rem;
        }
        .patient-info .info-grid {
             grid-template-columns: 1fr;
             text-align: left;
             gap: 5px;
        }
         .patient-info .address {
             grid-column: auto;
         }
         /* Adjust main container margin/padding on mobile if needed */
         .main-container {
            margin: 10px;
            padding: 15px;
         }
    }


    /* ========== Edit Profile Section ========== */
    .edit-profile-section {
        margin-bottom: 32px;
    }

    .edit-button {
        background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
        color: var(--white);
        font-weight: 500;
        padding: 10px 20px;
        border-radius: var(--border-radius);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        border: none;
        cursor: pointer;
        outline: none;
    }

    .edit-button:hover {
        background: linear-gradient(90deg, var(--secondary-color), var(--primary-color));
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
        transform: translateY(-2px);
    }

    .edit-button .icon-edit {
        width: 18px;
        height: 18px;
    }

    .profile-form-container {
        background-color: var(--white);
        border: 1px solid var(--medium-gray);
        border-radius: var(--border-radius);
        padding: 24px;
        margin-top: 16px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
    }
     .form-title {
        font-size: 1.3rem;
        font-weight: 600;
        color: var(--secondary-color);
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--medium-gray);
    }

    .profile-form .input-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 18px;
        margin-bottom: 24px;
    }

    .profile-form .form-group {
        display: flex;
        flex-direction: column;
    }
     .form-group.full-width {
        grid-column: 1 / -1;
    }


    .profile-form label {
        margin-bottom: 6px;
        font-weight: 500;
        font-size: 0.9rem;
        color: var(--dark-gray);
    }

    .profile-form input[type="text"],
    .profile-form input[type="tel"],
    .profile-form input[type="email"],
    .profile-form input[type="date"],
    .profile-form input[type="number"],
    .profile-form select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--input-border-color);
        border-radius: 6px;
        font-size: 0.95rem;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        background-color: var(--white);
    }
    .profile-form input:focus,
    .profile-form select:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px rgba(8, 184, 243, 0.2);
        outline: none;
    }
     .profile-form input[disabled] {
         background-color: var(--medium-gray);
         cursor: not-allowed;
     }

    .profile-form select {
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%236c757d'%3E%3Cpath fill-rule='evenodd' d='M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 10px center;
        background-size: 16px 16px;
        padding-right: 30px;
    }

    .save-button-container {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--medium-gray);
    }

    .save-button, .cancel-button {
        padding: 10px 20px;
        border-radius: 6px;
        font-weight: 500;
        font-size: 0.95rem;
        cursor: pointer;
        transition: background-color 0.3s ease, transform 0.2s ease;
        border: none;
    }

    .save-button {
        background-color: var(--success-color);
        color: white;
    }
    .save-button:hover {
        background-color: #218838;
        transform: translateY(-1px);
    }

    .cancel-button {
        background-color: var(--light-gray);
        color: var(--dark-gray);
        border: 1px solid var(--input-border-color);
    }
     .cancel-button:hover {
         background-color: var(--medium-gray);
         transform: translateY(-1px);
     }

    .slide-down {
        animation: slideDown 0.4s ease-out forwards;
        overflow: hidden;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-15px);
            max-height: 0;
        }
        to {
            opacity: 1;
            transform: translateY(0);
            max-height: 1000px;
        }
    }

    @media (max-width: 640px) {
        .profile-form .input-grid {
            grid-template-columns: 1fr;
            gap: 15px;
        }
         .form-group.full-width {
            grid-column: auto;
         }
        .save-button-container {
            flex-direction: column;
            gap: 10px;
        }
         .save-button, .cancel-button {
             width: 100%;
         }
         .profile-form-container {
             padding: 16px;
         }
    }


    /* ========== History Section ========== */
    .history-section {
        margin-top: 32px;
    }

    .section-title {
        font-size: 1.6rem;
        font-weight: 600;
        color: var(--secondary-color);
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid var(--primary-color);
    }

     .no-data-message {
        background-color: var(--medium-gray);
        color: var(--dark-gray);
        padding: 15px;
        border-radius: var(--border-radius);
        text-align: center;
        font-style: italic;
     }

    .card-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 20px;
    }

    .history-card {
        background-color: var(--white);
        border: 1px solid var(--medium-gray);
        border-radius: var(--border-radius);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.07);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
     .history-card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 5px;
        background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
    }

    .history-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
    }

    .card-header {
        background-color: var(--light-gray);
        padding: 10px 16px;
        font-weight: 600;
        color: var(--secondary-color);
        border-bottom: 1px solid var(--medium-gray);
        font-size: 1.1rem;
    }

    .card-content {
        padding: 16px;
        font-size: 0.95rem;
        color: var(--text-color);
        line-height: 1.6;
        flex-grow: 1;
    }

    .card-content p {
        margin-bottom: 10px;
    }

    .card-content strong {
        font-weight: 500;
        color: var(--secondary-color);
        margin-right: 4px;
    }

     .card-content .status {
         font-style: italic;
         color: var(--dark-gray);
         font-size: 0.9em;
     }
     .card-content .remarks {
         background-color: #eef8ff;
         padding: 8px 12px;
         border-radius: 4px;
         border-left: 3px solid var(--primary-color);
         margin-top: 10px;
     }

     .card-content .no-info {
         color: var(--dark-gray);
         font-style: italic;
         font-size: 0.9em;
         margin-top: 5px;
     }

    .divider {
        border: none;
        border-top: 1px dashed var(--medium-gray);
        margin: 16px 0;
    }
     .sub-header {
        font-weight: 600 !important;
        color: var(--text-color) !important;
        margin-bottom: 8px !important;
     }
     .prescription-details {
        margin-top: 5px;
        padding-left: 10px;
        border-left: 2px solid var(--medium-gray);
     }
     .medicine-item {
         margin-bottom: 12px;
         padding-bottom: 8px;
         border-bottom: 1px dotted #eee;
     }
     .medicine-item:last-child {
         margin-bottom: 5px;
         border-bottom: none;
     }
     .medicine-item p {
         margin-bottom: 4px;
         font-size: 0.9rem;
     }
     .prescriber {
         font-size: 0.9rem;
         color: var(--dark-gray);
         margin-top: 10px;
     }

    @media (max-width: 768px) {
        .card-container {
            grid-template-columns: 1fr;
            gap: 16px;
        }
    }

</style>