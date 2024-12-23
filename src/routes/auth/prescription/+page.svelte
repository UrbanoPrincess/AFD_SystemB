<script lang="ts">
    import { onMount } from 'svelte';
    import { firebaseConfig } from "$lib/firebaseConfig";
    import { initializeApp } from 'firebase/app';
    import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
    import { getAuth, onAuthStateChanged } from 'firebase/auth';
    import { goto } from '$app/navigation';
    import { Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    // State variables for patient and prescription data
    let patientId: string = '';
    let name: string = '';
    let lastName: string = '';
    let address: string = '';
    let age: number = 0;
    let email: string = '';
    let gender: string = '';
    let phone: string = '';
    let prescriptions: any[] = [];
    let loading: boolean = true;
    let error: string = '';

    // Fetch patient data based on the current user's ID
    async function fetchPatientData() {
        try {
            loading = true;

            // Fetch the current authenticated user's ID
            const user = auth.currentUser;
            if (user) {
                patientId = user.uid;

                // Fetch patient data from Firestore
                const patientDocRef = doc(db, "patientProfiles", patientId);
                const patientDoc = await getDoc(patientDocRef);

                if (patientDoc.exists()) {
                    const patient = patientDoc.data();
                    name = patient.name || 'No name available';
                    lastName = patient.lastName || 'No last name available';
                    address = patient.address || '';
                    age = patient.age || 0;
                    email = patient.email || '';
                    gender = patient.gender || '';
                    phone = patient.phone || '';
                } else {
                    error = "No such patient found!";
                }

                // Fetch all prescriptions for the patient
                const prescriptionsQuery = query(collection(db, "prescriptions"), where("patientId", "==", patientId));
                const prescriptionDocs = await getDocs(prescriptionsQuery);

                prescriptions = prescriptionDocs.docs.map(doc => doc.data());
                if (prescriptions.length === 0) {
                    error = "No prescriptions found for this patient!";
                }
            } else {
                error = "No authenticated user found!";
            }
        } catch (err) {
            console.error(err);
            error = "An error occurred while fetching data.";
        } finally {
            loading = false;
        }
    }

    // Fetch patient and prescription data when the component mounts
    onMount(() => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchPatientData();
            } else {
                error = "No authenticated user found!";
                loading = false;
            }
        });
    });
</script>



<!-- Main Content -->
<div style="padding: 40px; width: 100%; max-width: 50rem; margin: 100px; margin-top: 50px; border-radius: 0.5rem; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); background-color: white;">
    <!-- Header -->
    <div class="flex justify-between items-start mb-4">
        <div class="flex items-center">
            <img src="/images/logo(landing).png" alt="Sun with dental logo" class="w-24 h-18 mr-4" />
            <div>
                <h1 class="font-bold text-lg">AF DOMINIC</h1>
                <p class="text-sm">DENTAL CLINIC</p>
                <p class="text-sm">#46 12th Street, Corner Gordon Ave New Kalalake</p>
                <p class="text-sm">afdominicdentalclinic@gmail.com</p>
                <p class="text-sm">0932 984 9554</p>
            </div>
        </div>
    </div>

    <!-- Patient Profile Information -->
    {#if loading}
        <p>Loading...</p>
    {:else}
        {#if error}
            <p style="color: red;">{error}</p>
        {:else}
            <h2><strong>Name:</strong> {name} {lastName}</h2> 
            <p><strong>Address:</strong> {address || 'Not available'}</p>
            <p><strong>Age:</strong> {age || 'Not available'} years old</p>
            <p><strong>Gender:</strong> {gender || 'Not available'}</p>
            <p><strong>Phone:</strong> {phone || 'Not available'}</p>
            
            <!-- Prescription Details -->
            <h3 class="mt-4 font-semibold">Prescription Details</h3>
            {#if prescriptions.length > 0}
                <Table class="mt-2">
                    <TableHead>
                        <TableHeadCell>Date Visited</TableHeadCell>
                        <TableHeadCell>Medication</TableHeadCell>
                        <TableHeadCell>Instructions</TableHeadCell>
                        <TableHeadCell>Qty/Refills</TableHeadCell>
                        <TableHeadCell>Prescriber</TableHeadCell>
                    </TableHead>
                    <TableBody>
                        {#each prescriptions as prescription}
                            <TableBodyRow>
                                <TableBodyCell>{prescription.dateVisited || 'Not available'}</TableBodyCell>
                                <TableBodyCell>{prescription.medication || 'Not available'}</TableBodyCell>
                                <TableBodyCell>{prescription.instructions || 'Not available'}</TableBodyCell>
                                <TableBodyCell>{prescription.qtyRefills || 'Not available'}</TableBodyCell>
                                <TableBodyCell>{prescription.prescriber || 'Not available'}</TableBodyCell>
                            </TableBodyRow>
                        {/each}
                    </TableBody>
                </Table>
            {:else}
                <p>No prescriptions available.</p>
            {/if}
        {/if}
    {/if}

   
</div>
