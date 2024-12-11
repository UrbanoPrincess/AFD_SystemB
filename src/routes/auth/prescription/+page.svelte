<script lang="ts">
  import { onMount } from "svelte";
  import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
  import { getAuth } from "firebase/auth";  // Import Firebase Authentication
  import { initializeApp } from "firebase/app";
  import { firebaseConfig } from "$lib/firebaseConfig";  // Import firebase config

  let prescriptions: any[] = [];
  let error: string | null = null;
  let isLoading: boolean = true;

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);  // Initialize Firebase App
  const db = getFirestore(app);  // Get Firestore database instance
  const auth = getAuth(app);  // Firebase Authentication instance

  // Fetch prescriptions data when component mounts
  onMount(async () => {
    try {
      const user = auth.currentUser;  // Get the current logged-in user
      if (user) {
        // Reference the 'prescriptions' collection
        const prescriptionRef = collection(db, 'prescriptions');
        
        // Query to filter prescriptions by the current user's UID
        const q = query(prescriptionRef, where("userId", "==", user.uid));
        
        // Get filtered prescriptions
        const querySnapshot = await getDocs(q);

        // Extract documents into an array
        prescriptions = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,  // Using Firestore document ID as a unique identifier
            patientName: data.patientName,
            patientAddress: data.patientAddress,
            patientAge: data.patientAge,
            patientPhone: data.patientPhone,
            medications: data.medications,   // Ensure medications field is fetched
            instructions: data.instructions, // Ensure instructions field is fetched
            timestamp: data.timestamp,
            patientId: data.patientId,       // If needed for reference
            userId: data.userId
          };
        });
      } else {
        console.error("No user is logged in.");
      }
    } catch (err) {
      error = (err as Error).message;
    } finally {
      isLoading = false;
    }
  });
</script>

<style>
  /* Add your CSS styles here */
  .prescription-container {
    background-color: #f9fafb;
    padding: 20px;
    border-radius: 8px;
  }

  .prescription-item {
    margin-bottom: 20px;
    padding: 15px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }

  .prescription-item p {
    font-size: 14px;
    margin: 5px 0;
  }

  .title {
    font-weight: bold;
  }
</style>

<div class="flex items-center justify-center min-h-screen bg-gray-100">
  <div class="prescription-container w-full max-w-2xl">
    <!-- Header -->
    <div class="flex justify-between items-start mb-6">
      <div class="flex items-center">
        <img
          src="https://storage.googleapis.com/a1aa/image/vERFnmxhfbyhHyNwYkHJujmHtDFhPMbf9rPXjUx5RKtzbq4TA.jpg"
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
        <p class="text-sm">DATE: {new Date().toLocaleDateString()}</p>
      </div>
    </div>

    <!-- Patient and Prescription Details -->
    {#if isLoading}
      <p>Loading prescriptions...</p>
    {:else if error}
      <p>Error: {error}</p>
    {:else if prescriptions.length === 0}
      <p>No prescriptions found for the current user.</p>
    {:else}
      {#each prescriptions as prescription (prescription.id)}
        <div class="prescription-item">
          <div>
            <p class="title">NAME:<span> {prescription.patientName}</p>
            <p class="title">ADDRESS:<span> {prescription.patientAddress}</p>
            <p class="title">AGE:<span> {prescription.patientAge}</p>
            <p class="title">PHONE:<span> {prescription.patientPhone}</p>
          </div>
          <div>
            <p class="font-bold text-lg">Medications:</p>
            <p>{prescription.medications}</p> <!-- Correct field -->
            <p class="font-bold text-lg">Instructions:</p>
            <p>{prescription.instructions}</p> <!-- Correct field -->
            <p class="text-sm">Prescription Date: {new Date(prescription.timestamp.seconds * 1000).toLocaleString()}</p>
            <p class="text-sm"><span class="font-bold">Patient ID:</span> {prescription.patientId}</p>
            <p class="text-sm"><span class="font-bold">User ID:</span> {prescription.userId}</p>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
