<script lang="ts">
  import { onMount } from "svelte";
  import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
  import { initializeApp, getApps, getApp } from "firebase/app";
  import { firebaseConfig } from "$lib/firebaseConfig"; // Import your Firebase config
  import { getAuth, onAuthStateChanged } from "firebase/auth";

  // Define the type for prescription data
  type Prescription = {
      medication: string;
      dosage: string;
      dateIssued: string;
      patientId: string;
      userId: string;
  };

  let prescriptions: Prescription[] = [];
  let currentUserId: string = "";

  // Initialize Firebase App only if not already initialized
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const db = getFirestore(app);
  const auth = getAuth();

  // Set currentUserId dynamically
  onAuthStateChanged(auth, (user) => {
      if (user) {
          currentUserId = user.uid; // Set the user ID dynamically
      }
  });

  // Function to fetch prescription data from Firestore
  async function fetchPrescriptions() {
      try {
          // Query Firestore for prescriptions where userId matches the current user
          const q = query(collection(db, "prescriptions"), where("userId", "==", currentUserId));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
              console.log("No matching prescription documents found.");
          } else {
              prescriptions = querySnapshot.docs.map(doc => doc.data() as Prescription);
              console.log("Fetched prescriptions: ", prescriptions);
          }
      } catch (error) {
          console.error("Error fetching prescriptions: ", error);
      }
  }

  // Fetch data when component is mounted
  onMount(() => {
      fetchPrescriptions();
  });
</script>

<style>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css');
</style>

<div class="flex items-center justify-center min-h-screen bg-gray-100">
  <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
    <!-- Header -->
    <div class="flex justify-between items-start">
      <div class="flex items-center">
        <img 
          src="/images/logo(landing).png" 
          alt="Sun with dental logo" 
          class="w-16 h-16 mr-4"
        />
        <div>
          <h1 class="font-bold text-lg">AF DOMINIC</h1>
          <p class="text-sm">DENTAL CLINIC</p>
          <p class="text-sm">#46 12th Street, Corner Gordon Ave New Kalalake</p>
          <p class="text-sm">afdominicdentalclinic@gmail.com</p>
          <p class="text-sm">0932 984 9554</p>
        </div>
      </div>
      <div class="text-right">
        <p class="text-sm"></p>
      </div>
    </div>

    <!-- Patient and Prescription Details -->
    {#each prescriptions as { medication, dosage, dateIssued, patientId, userId } (userId + patientId)}
    <div class="flex justify-between mt-4">
      <div>
        <p class="text-sm"><span class="font-bold">MEDICATION:</span> {medication}</p>
        <p class="text-sm"><span class="font-bold">DOSAGE:</span> {dosage}</p>
        <p class="text-sm"><span class="font-bold">DATE ISSUED:</span> {dateIssued}</p>
        <p class="text-sm"><span class="font-bold">PATIENT ID:</span> {patientId}</p>
      </div>
      <div class="flex items-start">
        <div class="text-6xl font-bold mr-4">Rx</div>
        <div class="text-left">
          <p class="font-bold text-lg">Prescription Details</p>
        </div>
      </div>
    </div>
    {/each}

    <!-- Signature -->
    <div class="mt-8 text-right">
      <p class="text-sm">Signature of Prescriber</p>
    </div>
  </div>
</div>
