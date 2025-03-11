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
    <div class="patient-card">
        <img src="/images/logo(landing).png" 
             alt="Decorative logo" class="logo"/>
    
        <div class="patient-info">
            <h1>{`${patientProfile.name} ${patientProfile.lastName}` || "<Patient Name>"}</h1>
            <p><strong>Patient ID:</strong> {patientProfile.id || "xxxxxx"}</p>
            <p><strong>Age:</strong> {patientProfile.age || "xx"}</p>
            <p><strong>Gender:</strong> {patientProfile.gender || "xxxxx"}</p>
        </div>
    </div>
    
    
    
    

<!-- Edit Profile Dropdown Button -->
<div style="margin-top: 16px;">
    <button on:click={toggleEditProfile} class="professional-button">
        <span class="icon">
            {#if isEditingProfile}
                <svg xmlns="http://www.w3.org/2000/svg" class="icon-chevron" viewBox="0 0 24 24"><path d="M12 16l-4-4h8z"/></svg>
            {:else}
                <svg xmlns="http://www.w3.org/2000/svg" class="icon-chevron" viewBox="0 0 24 24"><path d="M12 8l4 4h-8z"/></svg>
            {/if}
        </span>
        <span class="button-text">{isEditingProfile ? 'Update Profile' : 'Update Profile'}</span>
    </button>
</div>

<!-- Form Section -->
{#if isEditingProfile}
        <div class="profile-form-container" style="padding: 20px; background-color: #f9fafb; border-radius: 8px; margin-top: 20px;">
            <form class="space-y-6" on:submit|preventDefault={savePatientProfile}>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="first-name" class="block text-sm font-medium text-gray-700">First Name</label>
                        <input id="first-name" type="text" bind:value={formPatientName} class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3" />
                    </div>
                    <div>
                        <label for="phone" class="block text-sm font-medium text-gray-700">Phone Number</label>
                        <input id="phone" type="tel" placeholder="ex. 09123456789" bind:value={formPhone} class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3" />
                    </div>
                    <div>
                        <label for="last-name" class="block text-sm font-medium text-gray-700">Last Name</label>
                        <input id="last-name" type="text" bind:value={formLastName} class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3" />
                    </div>
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-700">E-Mail Address</label>
                        <input id="email" type="text" bind:value={formEmail} class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3" />
                    </div>
                    <div>
                        <label for="home-address" class="block text-sm font-medium text-gray-700">Home Address</label>
                        <input id="home-address" type="text" bind:value={formHomeAddress} class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3" />
                    </div>
                    <div>
                        <label for="birthday" class="block text-sm font-medium text-gray-700">Birth Date</label>
                        <input id="birthday" type="date" bind:value={formBirthday} on:input={updateAge} class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3" />
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="age" class="block text-sm font-medium text-gray-700">Age</label>
                            <input id="age" type="number" bind:value={formAge} class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3" readonly />
                        </div>
                        <div>
                            <label for="gender" class="block text-sm font-medium text-gray-700">Gender</label>
                            <select id="gender" bind:value={formGender} class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3">
                                <option value="">Select</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="flex justify-end">
                    <button type="submit" class="professional-button">
                        Save
                    </button>
                </div>
            </form>
        </div>
    {/if}

<div class="combined-history">
    <h2 class="text-xl font-semibold text-gray-800 border-b pb-2 mb-6">
        Appointment and Prescription History
    </h2>
    {#if doneAppointments.length === 0}
        <p class="text-gray-500 italic">No past visits available.</p>
    {:else}
    <div class="card-container">
        {#each doneAppointments as appointment (appointment.id)}
            <div class="card">
                <p><strong>Date Visited:</strong> {appointment.date} at {appointment.time}</p>
                <p><strong>Service/Subservice:</strong> {appointment.service} ({appointment.status})</p>
                
                {#if prescriptions && prescriptions.filter(p => p.appointmentId === appointment.id).length > 0}
                    {#each prescriptions.filter(p => p.appointmentId === appointment.id) as prescription}
                        <p><strong>Medication:</strong> {prescription.medicines.map((m: { medicine: any }) => `${m.medicine}`).join(", ")}</p>
                        <p><strong>Instructions:</strong> {prescription.medicines.map((m: { instructions: any; }) => m.instructions).join(", ")}</p>
                        <p><strong>Qty/Refills:</strong> {prescription.medicines.map((m: { dosage: any; }) => m.dosage).join(", ")}</p>
                        <p><strong>Prescriber:</strong> {prescription.prescriber || "N/A"}</p>
                    {/each}
                {:else}
                    <p class="italic text-gray-500">No prescription issued for this visit.</p>
                {/if}
                
                <!-- New Remarks Section -->
                {#if appointment.remarks}
                    <p><strong>Remarks:</strong> {appointment.remarks}</p>
                {:else}
                    <p class="italic text-gray-500">No remarks for this visit.</p>
                {/if}
            </div>
        {/each}
    </div>
    {/if}
</div>
</div>
<!-- Styling for the dropdown -->
<style>
   /* Main container to make it scrollable */
   .main-container {
    height: calc(100vh - 168px); /* Subtract the header height */
    overflow-y: auto; /* Allow vertical scrolling */
    padding: 16px;  /* Optional padding for spacing */
}

/* Hide scrollbar for Webkit browsers (Chrome, Safari) */
.main-container::-webkit-scrollbar {
    display: none;
}

/* Hide scrollbar for Internet Explorer 10+ and Firefox */
.main-container {
    -ms-overflow-style: none;
    scrollbar-width: none;
    height: 100%;
}

.patient-card {
    background: linear-gradient(90deg, #ffffff, #ffff, #eaee00, #eaee00, #08B8F3, #08B8F3, #005b80);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    width: 68rem;
    max-width: 100%;
    justify-content: flex-start;
    gap: 16px;
}

/* Patient Info Styles */
.patient-info {
    color: black;
    font-size: 1rem;
    flex-grow: 1;
    min-width: 0; /* Prevents text from overflowing */
    word-wrap: break-word;
}

.patient-info h1 {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 8px;
}

/* 🔹 Mobile: Smaller Compact Card */
@media (max-width: 768px) {
    .patient-card {
    background: #08B8F3; /* Solid blue */
    display: flex;
    flex-direction: column;
    align-items: center; /* Center content */
    text-align: center; /* Align text */
    padding: 6px 8px; /* Smaller padding */
    width: 100%; /* Full width of the container */
    min-width: 220px; /* Ensures a wider minimum width */
    max-width: 250px; /* Wider max width */
    min-height: 80px; /* Minimum height to keep content visible */
    border-radius: 12px; /* Softer, more card-like look */
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2); /* Light shadow for depth */


    }

    .logo {
        display: none; /* Hide logo */
    }

    .patient-info {
        color: white;
        font-size: 0.8rem; /* Smaller text */
        width: 100%;
        text-align: left;
    }

    .patient-info h1 {
        font-size: 1rem; /* Reduce name size */
        margin-bottom: 2px;
    }

    .patient-info p {
        font-size: 0.8rem; /* Reduce text size */
        margin-bottom: 2px;
        line-height: 1.1; /* Tighter spacing */
    }
}


    .logo {
        width: 10rem; /* Increased logo size */
        height: 10rem; /* Increased logo size */
        border-radius: 50%;
        margin-right: 16px;
        object-fit: cover; /* Ensure the logo fits well */
    }

   

.professional-button {
        background: linear-gradient(90deg, #08B8F3, #005b80); /* Gradient background */
        color: rgb(255, 255, 255);
        font-family: 'Roboto', sans-serif; /* Professional font */
        font-weight: 550; /* Slightly lighter font weight */
        padding: 0.5rem 1rem; /* Smaller padding for a more compact button */
        border-radius: 0.3rem; /* More rounded corners */
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.582); /* Subtle shadow for depth */
        display: flex;
        align-items: center;
        transition: background 0.3s ease, transform 0.2s ease; /* Smooth transitions */
        border: none;
        cursor: pointer;
        outline: none; /* Remove outline */
    }

    .professional-button:hover {
        background: linear-gradient(90deg, #005b80, #08B8F3); /* Reverse gradient on hover */
        transform: translateY(2px); /* Slight lift effect */
    }

    .icon {
        margin-right: 0.5rem; /* Space between icon and text */
        display: flex;
        align-items: center;
    }

    .icon-chevron {
        margin-left: -0.6rem;
        width: 24px;
        height: 24px;
        fill: rgb(255, 255, 255);
    }

    .button-text {
        margin-left: -0.4rem;
        font-size: 1rem; /* Adjust font size as needed */
    }
    
    .profile-form-container{
        background-color: white;
    border-radius: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    /* Card Styling */
    .card-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
    justify-content: center;
    }

    .card {
        background-color: #fff;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        position: relative;
        overflow: hidden;
    }

    /* Solid Box-Shadow Effect on Top */
    .card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 6px; /* Height of the solid bar */
        background: linear-gradient(90deg, #08B8F3, #005b80); /* Gradient background */
    }

    /* Hover Effect */
    .card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
    }

    .card p {
        margin-bottom: 8px;
        font-size: 1rem;
        color: #333;
    }

    .card p strong {
        color: #08B8F3; /* Bright blue for labels */
    }

    .card .italic {
        color: red;
    }

    /* Responsive Styles */
    @media (max-width: 768px) {
        .card-container {
            grid-template-columns: repeat(auto-fit, minmax(100%, 1fr));
            gap: 12px;
        }
    }



</style>
