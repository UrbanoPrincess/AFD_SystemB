<script lang="ts">
  import { onMount } from "svelte";
  import { getFirestore, collection, addDoc, getDoc, doc } from "firebase/firestore";
  import { firebaseConfig } from "$lib/firebaseConfig";
  import { initializeApp, getApps, getApp } from "firebase/app";
  import { getAuth, onAuthStateChanged } from "firebase/auth";
  import type { User } from "firebase/auth";

  // Firebase setup
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const db = getFirestore(app);
  const auth = getAuth(app);

  // State for form inputs and data display
  let formPatientName = '';
  let formLastName = '';
  let formAge = '';
  let formGender = '';
  let formEmail = '';
  let formPhone = '';
  let formHomeAddress = '';
  let formPatientId = '';
  let successMessage = ''; // For success message

  let patientProfile = {
      name: '',
      id: '',
      age: '',
      gender: '',
      email: '',
      phone: '',
      address: '',
      lastName: ''
  };

  let currentUser: User | null = null;

  // Monitor auth state changes
  onMount(() => {
      const savedProfile = localStorage.getItem("patientProfile");
      if (savedProfile) {
          patientProfile = JSON.parse(savedProfile);
          console.log("Loaded patient profile from localStorage: ", patientProfile);
      }

      const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
              currentUser = user;
              console.log("User is logged in: ", currentUser);
          } else {
              currentUser = null;
              console.log("User is not logged in");
          }
      });

      return () => unsubscribe();
  });

  // Save patient profile to Firestore with auto-generated ID
  async function savePatientProfile() {
      if (!currentUser) {
          console.log("Please log in to save the profile.");
          return;
      }

      try {
          const patientRef = collection(db, "patientProfiles");
          const newPatientDoc = await addDoc(patientRef, {
              name: formPatientName,
              age: formAge,
              gender: formGender,
              email: formEmail,
              phone: formPhone,
              address: formHomeAddress,
              lastName: formLastName
          });

          patientProfile = {
              name: formPatientName,
              age: formAge,
              gender: formGender,
              email: formEmail,
              phone: formPhone,
              address: formHomeAddress,
              lastName: formLastName,
              id: newPatientDoc.id
          };

          formPatientId = newPatientDoc.id;
          localStorage.setItem("patientProfile", JSON.stringify(patientProfile)); // Save to localStorage
          console.log("Patient profile saved successfully with ID:", formPatientId);

          successMessage = "Patient profile saved successfully!";
          setTimeout(() => {
              successMessage = '';
          }, 3000); // Clear message after 3 seconds
      } catch (error) {
          console.error("Error saving patient profile: ", error);
      }
  }
</script>

<div class="flex items-center justify-center min-h-screen">
  <div class="bg-white rounded-lg shadow-lg flex flex-col form-container">
      <!-- Header Section -->
      <div class="flex items-center" style="background-color: #08B8F3; border-top-left-radius: 8px; border-top-right-radius: 8px; padding: 16px; height: 168px;">
          <img src="/images/logo(landing).png" 
               alt="Decorative logo" style="width: 80px; height: 80px; border-radius: 50%; margin-right: 16px;" />
          <div class="text-white">
              <h1 class="text-lg font-bold">{patientProfile.name || '<Patient_name>'}</h1>
              <p>Patient ID: {patientProfile.id || 'xxxxxx'}</p>
              <p>Age: {patientProfile.age || 'xx'}    Gender: {patientProfile.gender || 'xxxxx'}</p>
          </div>
      </div>

      <form class="space-y-6 p-6" on:submit|preventDefault={savePatientProfile}>
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
</div>

<!-- Success message -->
{#if successMessage}
  <div class="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg">
      {successMessage}
  </div>
{/if}

<style>
  :global(body) {
      margin: 0;
      font-family: sans-serif;
      background-color: #f3f4f6;
  }
  .form-container {
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      margin: auto;
      overflow-y: auto;
  }
  @media (min-width: 768px) {
      .form-container {
          max-width: 1337px;
      }
  }
</style>
