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
        address: ''
    };

    let currentUser: User | null = null;
    let isEditingProfile = false; // Toggle for edit profile
    let doneAppointments: any[] = [];
    let isDropdownOpen = true;

    // Monitor auth state changes
    onMount(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUser = user;
                console.log("User is logged in: ", currentUser);

                try {
                    // Fetch user profile from Firestore
                    const patientRef = doc(db, "patientProfiles", currentUser.uid);
                    const patientDoc = await getDoc(patientRef);

                    if (patientDoc.exists()) {
                        patientProfile = patientDoc.data() as PatientProfile;
                        console.log("Loaded patient profile from Firestore: ", patientProfile);
                    } else {
                        console.log("No profile found for this user. Using default values.");
                        patientProfile = {
                            name: '',
                            lastName: '',
                            id: currentUser.uid,
                            age: '',
                            gender: '',
                            email: '',
                            phone: '',
                            address: ''
                        };
                    }

                    // Fetch prescriptions
                    const prescriptionsRef = collection(db, "prescriptions");
                    const q = query(prescriptionsRef, where("patientId", "==", currentUser.uid));
                    const prescriptionsSnapshot = await getDocs(q);
                    prescriptions = prescriptionsSnapshot.docs.map(doc => doc.data());
                    console.log("Loaded prescriptions: ", prescriptions);

                    // Get appointments where status is "Completed"
                    const appointmentsRef = collection(db, "appointments");
                    const qAppointments = query(
                        appointmentsRef,
                        where("patientId", "==", currentUser.uid),
                        where("status", "==", "Completed")
                    );
                    const querySnapshot = await getDocs(qAppointments);
                    doneAppointments = querySnapshot.docs.map((doc) => doc.data());
                    console.log("Loaded done appointments: ", doneAppointments); // Debugging log

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
                    address: ''
                };
                doneAppointments = [];
                prescriptions = [];
                console.log("User is not logged in.");
            }
        });

        return () => unsubscribe();
    });

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
        if (!formPatientName || !formAge || !formEmail || !formPhone) {
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
            formGender = patientProfile.gender;
            formEmail = patientProfile.email;
            formPhone = patientProfile.phone;
            formHomeAddress = patientProfile.address;
        } else {
            // Reset form fields when editing is canceled
            formPatientName = "";
            formLastName = "";
            formAge = "";
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
<div class="header-section" style="background-color: #08B8F3; border-top-left-radius: 8px; border-top-right-radius: 8px; padding: 16px; height: 168px; display: flex; align-items: center; width: 1000px; margin-top: 10px;">
    <img src="/images/logo(landing).png" 
         alt="Decorative logo" class="logo" style="width: 80px; height: 80px; border-radius: 50%; margin-right: 16px;" />
    <div style="color: white;">
      <h1 class="text-lg font-bold" style="font-size: 1.25rem; font-weight: bold;">
        {`${patientProfile.name} ${patientProfile.lastName}` || "<Patient Name>"}
      </h1>
      <p>Patient ID: {patientProfile.id || "xxxxxx"}</p>
      <p>Age: {patientProfile.age || "xx"} Gender: {patientProfile.gender || "xxxxx"}</p>
    </div>
</div>

<!-- Edit Profile Dropdown Button -->
<div style="margin-top: 16px;">
        <button 
            on:click={toggleEditProfile}
            class="bg-blue-500 text-white font-bold py-2 px-4 rounded-md shadow-md hover:bg-blue-600 flex items-center">
            
            <!-- Arrow Icon (Left when not editing, Right when editing) -->
            <span class="mr-2">
                {#if isEditingProfile}
                <i class="fas fa-chevron-up"></i>  
                {:else}
                <i class="fas fa-chevron-right"></i>  
                {/if}
            </span>
            
            <!-- Button Text -->
            {isEditingProfile ? "Cancel Edit" : "Edit Profile"}
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
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="age" class="block text-sm font-medium text-gray-700">Age</label>
                        <input id="age" type="number" bind:value={formAge} class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3" />
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
                <button type="submit" class="bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-md hover:bg-blue-600">
                    Save
                </button>
            </div>
        </form>
    </div>
{/if}

<!-- View Past Visits and Prescription History -->
<div class="flex justify-between">
    <!-- View Past Visits Dropdown -->
    <div class="view-past-visits w-1/2 pr-2">
        <button class="dropdown-btn" on:click={toggleDropdown}>
            <span class="mr-2">
                {#if isDropdownOpen}
                    <i class="fas fa-chevron-up"></i>  
                {:else}
                    <i class="fas fa-chevron-right"></i>  
                {/if}
            </span>
            {#if isDropdownOpen}
                Hide Past Visits
            {:else}
                View Past Visits
            {/if}
        </button>

        {#if isDropdownOpen}
        <div class="dropdown-content">
            {#if doneAppointments.length === 0}
                <p>No completed appointments available.</p>
            {:else}
                <ul class="space-y-4">
                    {#each doneAppointments as appointment}
                        <li class="p-4 border border-gray-200 rounded-lg">
                            <div class="flex justify-between">
                                <div>
                                    <h3 class="text-lg font-bold">Date: {appointment.date}</h3>
                                    <p class="text-sm text-gray-600">Time: {appointment.time}</p>
                                    <p class="text-sm text-gray-600">Service: {appointment.service}</p>
                                </div>
                                <div class="flex flex-col items-end">
                                    <span class="text-sm text-gray-500">Status: {appointment.status}</span>
                                </div>
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
        {/if}
    </div>

    <!-- Prescription History Dropdown -->
    <div class="view-prescriptions w-1/2 pl-2">
        <button class="dropdown-btn" on:click={togglePrescriptionDropdown}>
            <span class="mr-2">
                {#if isPrescriptionDropdownOpen}
                <i class="fas fa-chevron-up"></i>  
                {:else}
                <i class="fas fa-chevron-right"></i>  
                {/if}
            </span>
            {#if isPrescriptionDropdownOpen}
                Hide Prescription History
            {:else}
                View Prescription History
            {/if}
        </button>

        {#if isPrescriptionDropdownOpen}
        <div class="dropdown-content">
            {#if prescriptions.length === 0}
                <p>No prescriptions available.</p>
            {:else}
                <ul class="space-y-4">
                    {#each prescriptions as prescription}
                        <li class="p-4 border border-gray-200 rounded-lg">
                            <div class="flex justify-between">
                                <div>
                                    <h3 class="text-lg font-bold">Date: {prescription.dateVisited}</h3>
                                    <p class="text-sm text-gray-600">Medications: {prescription.medication}</p>
                                    <p class="text-sm text-gray-600">Instructions: {prescription.instructions}</p>
                                    <p class="text-sm text-gray-600">Qty/Refills: {prescription.qtyRefills}</p>
                                    <p class="text-sm text-gray-600">Prescriber: {prescription.prescriber}</p>
                                </div>
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
        {/if}
    </div>
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

.dropdown-btn {
    display: flex;                /* Enable flexbox layout */
    align-items: center;          
    padding: 10px;
    background-color: #d7dad7;
    color: black;
    border: none;
    cursor: pointer;
    text-align: right;             /* Align text to the left */
    width: 100%;
    font-size: 16px;
    border-radius: 5px;
    margin-top: 10px;
}

.dropdown-btn:hover {
    background-color: #098ED0;
    
}

.dropdown-content {
    margin-top: 10px;
    padding: 10px;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 5px;
}
    .profile-form-container{
        background-color: white;
    border-radius: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
   
</style>
