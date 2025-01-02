<script lang="ts">
    import { onMount } from 'svelte';
    import { firebaseConfig } from "$lib/firebaseConfig";
    import { initializeApp } from 'firebase/app';
    import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
    import { getAuth, onAuthStateChanged } from 'firebase/auth';
    import { goto } from '$app/navigation';
    import jsPDF from 'jspdf';
    import { Button } from 'flowbite-svelte';

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

    // Helper function to format date
    function formatDate(timestamp: string): string {
        const date = new Date(timestamp);
        return date.toISOString().split('T')[0];
    }

    // Fetch patient data based on the current user's ID
    async function fetchPatientData() {
        try {
            loading = true;

            const user = auth.currentUser;
            if (user) {
                patientId = user.uid;

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

    // Generate PDF for a prescription
    function generatePDF(prescription: any, index: number) {
        const doc = new jsPDF();
        doc.setFontSize(12);
        doc.text("AF Dominic Dental Clinic", 10, 10);
        doc.text("#46 12th Street, Corner Gordon Ave New Kalalake", 10, 20);
        doc.text("afdominicdentalclinic@gmail.com | 0932 984 9554", 10, 30);
        doc.text(`Prescription ${index + 1}`, 10, 50);
        doc.text(`Date Visited: ${formatDate(prescription.dateVisited) || 'Not available'}`, 10, 60);
        doc.text(`Medication: ${prescription.medication || 'Not available'}`, 10, 70);
        doc.text(`Instructions: ${prescription.instructions || 'Not available'}`, 10, 80);
        doc.text(`Qty/Refills: ${prescription.qtyRefills || 'Not available'}`, 10, 90);
        doc.text(`Prescriber: ${prescription.prescriber || 'Not available'}`, 10, 100);

        doc.save(`Prescription_${index + 1}.pdf`);
    }

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

<div style="padding: 30px; width: 200%; max-width: 50rem; margin: 100px; margin-top: 40px; border-radius: 0.5rem; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); background-color: white;">
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

            <h3 class="mt-4 font-semibold">Prescription Details</h3>
            {#if prescriptions.length > 0}
                <div class="mt-4 max-h-96 overflow-y-auto">
                    {#each prescriptions as prescription, index}
                        <div class="p-4 border rounded-lg shadow-md mb-4">
                            <h4 class="font-bold">Prescription {index + 1}</h4>
                            <p><strong>Date Visited:</strong> {formatDate(prescription.dateVisited) || 'Not available'}</p>
                            <p><strong>Medication:</strong> {prescription.medication || 'Not available'}</p>
                            <p><strong>Instructions:</strong> {prescription.instructions || 'Not available'}</p>
                            <p><strong>Qty/Refills:</strong> {prescription.qtyRefills || 'Not available'}</p>
                            <p><strong>Prescriber:</strong> {prescription.prescriber || 'Not available'}</p>
                            <button on:click={() => generatePDF(prescription, index)} class="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">
                                Download PDF
                            </button>
                        </div>
                    {/each}
                </div>
            {:else}
                <p>No prescriptions available.</p>
            {/if}
        {/if}
    {/if}
</div>
