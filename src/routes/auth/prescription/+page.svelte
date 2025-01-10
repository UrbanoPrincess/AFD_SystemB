<script lang="ts">
    import { onMount } from 'svelte';
    import { firebaseConfig } from "$lib/firebaseConfig";
    import { initializeApp } from 'firebase/app';
    import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
    import { getAuth, onAuthStateChanged } from 'firebase/auth';
    import { goto } from '$app/navigation';
    import jsPDF from 'jspdf';
    import { Button } from 'flowbite-svelte';

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
    let birthday: string = '';
    let prescriptions: any[] = [];
    let loading: boolean = true;
    let error: string = '';

   // Helper function to format date
function formatDate(date: string | number | Date) {
    const parsedDate = new Date(date);
    if (parsedDate.getTime()) {
        // Format the date as MM/DD/YYYY or customize as needed
        const day = String(parsedDate.getDate()).padStart(2, '0');
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
        const year = parsedDate.getFullYear();
        
        return `${month}/${day}/${year}`;  // Format as MM/DD/YYYY
    } else {
        return "Invalid date";  // Return a fallback value for invalid dates
    }
}



    // Fetch patient data based on the current user's ID
async function fetchPatientData() {
    try {
        loading = true;

        const user = auth.currentUser;
        if (user) {
            patientId = user.uid;

            // Fetch patient profile
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
                birthday = patient.birthday || '';
            } else {
                error = "No Patient Information Found!";
            }

            // Fetch completed appointments for the patient
            const appointmentsRef = collection(db, "appointments");
            const qAppointments = query(
                appointmentsRef,
                where("patientId", "==", patientId),
                where("status", "==", "Completed")
            );
            const querySnapshot = await getDocs(qAppointments);
            const doneAppointments = querySnapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id, // Include Firestore document ID
                date: doc.data().date // Add the appointment date here
            }));
            console.log("Loaded done appointments: ", doneAppointments); // Debugging log

            // Check if appointmentId exists before proceeding
            const appointmentIds = doneAppointments
                .filter(appointment => appointment.id) // Filter out appointments without an id
                .map(appointment => appointment.id);

            // Fetch prescriptions based on appointmentIds
            if (appointmentIds.length > 0) {
                const prescriptionsRef = collection(db, "prescriptions");
                const qPrescriptions = query(
                    prescriptionsRef,
                    where("appointmentId", "in", appointmentIds) // Filter prescriptions by appointmentId
                );
                const prescriptionsSnapshot = await getDocs(qPrescriptions);
                prescriptions = prescriptionsSnapshot.docs.map(doc => {
                    const appointmentId = doc.data().appointmentId;
                    // Find the corresponding appointment date from the completed appointments
                    const appointment = doneAppointments.find(app => app.id === appointmentId);
                    return {
                        appointmentId: appointmentId,
                        appointmentDate: appointment ? appointment.date : null, // Use appointment date
                        medicines: doc.data().medicines,
                        prescriber: doc.data().prescriber
                    };
                });
                console.log("Loaded prescriptions: ", prescriptions); // Debugging log
            } else {
                console.log("No valid appointment IDs found.");
            }
        } else {
            error = "No authenticated user found!";
        }
    } catch (err) {
        console.error("Error loading data: ", err);
        error = "An error occurred while fetching data.";
    } finally {
        loading = false;
    }
}



function generatePDF(prescription: any, index: number) {
    // Initialize jsPDF in landscape orientation
    const doc = new jsPDF({ orientation: "landscape" });

    // Set the font and size
    doc.setFont("helvetica", "normal");

    // Header
    doc.addImage('/images/af dominic.jpg', 'JPG', 20, 8, 30, 30); // Adjust the path, format, and dimensions as needed
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);

    // Set text color to indigo-600 (approximately RGB: 67, 56, 202)
    doc.setTextColor(67, 56, 202);
    doc.text("AFDomingo", 50, 15); // Clinic name

    // Reset text color to black for subsequent text
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("DENTAL CLINIC", 50, 20);
    doc.text("#46 12th Street, Corner Gordon Ave, New Kalalake", 50, 25);
    doc.text("afdomingodentalclinic@gmail.com", 50, 30);
    doc.text("0932 984 9554", 50, 35);
    doc.line(20, 40, 277, 40); // Horizontal line

    // Prescription Title
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Prescription", 20, 48);

    // Patient Details
    const patientFirstName = name.toUpperCase(); // Make sure `name` is available in scope
    const patientLastName = lastName.toUpperCase(); // Make sure `lastName` is available in scope

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Date: ${formatDate(prescription.appointmentDate) || 'Not available'}`, 20, 55);
    doc.text(`Patient Name: ${patientFirstName} ${patientLastName}`, 20, 62);

    // Prescription Details (Loop through medicines array)
    let yPosition = 77; // Start position for prescription details

    // Loop through medicines array to list all medicines
    prescription.medicines.forEach((medicine: any, medicineIndex: number) => {
        doc.setFontSize(11);
        doc.text(`Medicine: ${medicine.medicine || 'Not available'}`, 20, yPosition);
        doc.text(` Qty/Refills ${medicine.dosage || 'Not available'}`, 20, yPosition + 8);
        doc.text(`Instructions: ${medicine.instructions || 'Not available'}`, 20, yPosition + 16);
        yPosition += 24; // Adjust space for next medicine
    });

    // Add prescriber info on the right side
    const prescriberText = `Prescriber: ${prescription.prescriber || 'Not available'}`;
    const pageWidth = doc.internal.pageSize.width; // Get the page width dynamically
    const prescriberX = pageWidth - 70; // Adjust for right alignment
    const prescriberY = 175; // Position it just above the footer
    doc.text(prescriberText, prescriberX, prescriberY);

    // Add signature image
    const signaturePath = '/images/signature.jpg'; // Update with the correct path to the signature image
    const signatureWidth = 50; // Adjust width as needed
    const signatureHeight = 20; // Adjust height as needed
    const signatureX = pageWidth - 70; // Position it near the right margin
    const signatureY = 150; // Position just above the footer
    doc.addImage(signaturePath, 'JPG', signatureX, signatureY, signatureWidth, signatureHeight);

    // Footer
    doc.line(20, 190, 277, 190); // Footer line
    doc.setFontSize(12);
    doc.text("Promoting Healthy Teeth & Smiles", 148.5, 200, { align: "center" });

    // Save the PDF with the patient's name
    const filename = `${patientFirstName}_${patientLastName}_Prescription_${index + 1}.pdf`;
    doc.save(filename);
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
<div style="max-height: 100vh; overflow-y: auto;">
    <header style="
    padding-top: 1rem;

  padding-left: 1rem;
  
">
<div class="header-section" style="background-color: #08B8F3; border-top-left-radius: 8px; border-top-right-radius: 8px; padding: 16px; height: 168px; display: flex; align-items: center; width: 1000px; margin-top: 10px;">
  <div class="flex items-center">
      <img 
          src="/images/logo(landing).png" 
          alt="Sun with dental logo" 
          class="logo" 
      />
      <div class="header-info">
          <h1 class="patient-name">AFDomingo</h1>
          <p class="patient-details">DENTAL CLINIC</p>
          <p class="patient-details">#46 12th Street, Corner Gordon Ave New Kalalake</p>
          <p class="patient-details">afdomingodentalclinic@gmail.com</p>
          <p class="patient-details">0932 984 9554</p>
      </div>
  </div>
</div>
</header>
<div class="container">
    <div class="header">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-person" viewBox="0 0 16 16">
            <path d="M10 5a2 2 0 1 0-4 0 2 2 0 0 0 4 0z"/>
            <path d="M0 14s1-3 7-3 7 3 7 3v1H0v-1z"/>
        </svg>
        <h2><strong>Name: {name} {lastName}</strong></h2>
    </div>

    {#if loading}
    <p class="loading">Loading...</p>
{:else}
    {#if error}
        <p class="error">{error}</p>
    {:else}
        <div class="info"><strong>Address:</strong> {address || 'Not available'}</div>
        <div class="info"><strong>Age:</strong> {age || 'Not available'} years old</div>
        <div class="info"><strong>Gender:</strong> {gender || 'Not available'}</div>
        <div class="info"><strong>Phone:</strong> {phone || 'Not available'}</div>
        <div class="info"><strong>Birthday:</strong> {birthday || 'Not available'}</div>

        <h3 class="prescription-header mt-4 font-bold">Prescriptions</h3>        {#if prescriptions.length > 0}
    <div class="mt-4">
        {#each prescriptions as prescription, index}
            <div class="card">
                <h4 class="font-bold">Prescription {index + 1}</h4>
                <p><strong>Date Visited:</strong> {formatDate(prescription.appointmentDate) || 'Not available'}</p>

                <h5 class="font-bold mt-2">Medication Details:</h5>
                {#each prescription.medicines as medicine, medicineIndex}
                    <div class="mt-2">
                        <p><strong>Medicine {medicineIndex + 1}:</strong> {medicine.medicine || 'Not available'}</p>
                        <p><strong>Qty/Refills:</strong> {medicine.dosage || 'Not available'}</p>
                        <p><strong>Instructions:</strong> {medicine.instructions || 'Not available'}</p>
                    </div>
                {/each}

                <p><strong>Prescriber:</strong> {prescription.prescriber || 'Not available'}</p>
                <button on:click={() => generatePDF(prescription, index)} class="button">
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
</div>
<style>
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

.card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 6px; /* Height of the solid bar */
    background: linear-gradient(90deg, #08B8F3, #005b80); /* Gradient background */
}

.card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
}
.card h4, h5 {
    margin-bottom: 0.6rem;
    font-size: 1.1rem;
    color: #005b80;
}

.card p {
    margin-bottom: 0.2rem;
    font-size: 1rem;
    color: #333;
}

.card p strong {
    color: #08B8F3; /* Bright blue for labels */
}


.prescription-header {
    font-size: 1.5rem; /* Larger font size for emphasis */
    color: #000000; /* Use the same color as the gradient for consistency */
    margin-bottom: 16px; /* Space below the header */
    border-bottom: 2px solid #ddd; /* Underline effect */
    padding-bottom: 8px; /* Space between text and underline */
    text-transform: uppercase; /* Make the text uppercase for emphasis */
}

/* Responsive Styles */
@media (max-width: 768px) {

}
    .container {
        margin-top: 0.5rem;
        max-width: 100%;
        padding: 20px;
        background-color: #f9f9f9;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
    }
    .header h2 {
        padding-bottom: -2rem;
        margin-left: 10px;
    }
    .info {
        margin-top: 2rem;
        margin: 2px 0; /* Reduced margin to bring elements closer */
        font-size: 16px;
    }

    .button {
        background: linear-gradient(90deg, #08B8F3, #005b80);
        color: rgb(255, 255, 255);
        font-family: 'Roboto', sans-serif;
        font-weight: 550;
        padding: 0.5rem 1rem;
        border-radius: 0.3rem;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.582);
        display: flex;
        align-items: center;
        transition: background 0.3s ease, transform 0.2s ease;
        border: none;
        cursor: pointer;
        outline: none;
    }

    .button:hover {
        background: linear-gradient(90deg, #005b80, #08B8F3);
        transform: translateY(2px);
    }

    .error {
        color: red;
    }
    .loading {
        font-style: italic;
    }

    .header-section {
        background: linear-gradient(90deg, #ffffff, #ffff, #eaee00, #eaee00, #08B8F3, #08B8F3, #005b80);
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        padding: 16px;
        height: 168px;
        display: flex;
        align-items: center;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.301);
    }

    .logo {
        width: 10rem;
        height: 10rem;
        border-radius: 50%;
        margin-right: 16px;
        object-fit: cover;
    }

    .header-info {
        color: #000000;
    }

    .patient-name {
        font-size: 1.3rem;
        font-weight: bold;
        margin: 0;
    }

    .patient-details {
        margin: 2px 0;
        font-size: 1rem;
        color: #000000;
        line-height: 1.2;
    }

    /* Responsive Styles */
    @media (max-width: 768px) {
        .header-section {
            flex-direction: column;
            align-items: flex-start;
            padding: 12px;
        }

        .logo {
            width: 8rem;
            height: 8rem;
            margin-bottom: 12px;
        }

        .patient-name {
            font-size: 1.25rem;
        }

        .patient-details {
            font-size: 0.875rem;
        }
    }
</style>