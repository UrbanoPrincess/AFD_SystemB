<script lang="ts">
  import { Checkbox, Datepicker } from 'flowbite-svelte';
import { onMount } from "svelte";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, where, updateDoc, getDoc, onSnapshot, } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "$lib/firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import '@fortawesome/fontawesome-free/css/all.css';
import { Button, Modal, Dropdown, DropdownItem } from 'flowbite-svelte';
import { ExclamationCircleOutline, CloseOutline,CloseCircleOutline} from 'flowbite-svelte-icons';
import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
import Swal from 'sweetalert2';



const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

type Appointment = {
  id: string;
  date: string;
  time: string;
  patientId: string;
  service: string;
  subServices: string[];
  cancellationStatus?: 'pending' | 'Approved' | 'Decline' | 'requested' | null;
  status: "pending" | "Decline"| "Missed"  | "confirmed" | "Completed" | "cancelled" | "Accepted" | "cancellationRequested" | "";
};

let selectedDate = new Date();
let selectedTime: string | null = null;
let selectedService: string | null = null;
let selectedSubServices: string[] = []; // Array to hold selected sub-services
let appointments: Appointment[] = [];
let patientId: string | null = null;
let reasonNotAvailable = false;
  let reasonSchedulingConflict = false;
  let reasonOther = false;

  // Collect the selected reasons into an array
  function getSelectedReasons() {
    const reasons = [];
    if (reasonNotAvailable) reasons.push('Service is no longer needed');
    if (reasonSchedulingConflict) reasons.push('Scheduling conflict');
    if (reasonOther) reasons.push('Other');
    return reasons;
  }
// Declare services
const services = [
  "Consultation",
  "Oral Prophylaxis / Linis",
  "Filling / Pasta",
  "COSMETIC",
  "ORAL SURGERY",
  "ENDODONTIC",
  "PROSTHODONTICS",
  "CROWNS",
  "ORTHODONTICS",
  "TMJ",
  "IMPLANTS"
];

// Define the type for subServices
type SubServices = {
  [key: string]: string[]; // Allow any string as a key
};

const subServices: SubServices = {
  "Oral Prophylaxis / Linis": ["Simple & Deep Scaling", "Fluoride"],
  "Filling / Pasta": ["Composite", "Temporary", "Pit & Fissure Sealants"],
  "COSMETIC": ["Whitening", "Laminate / Veneer"],
  "ORAL SURGERY": ["Simple", "Complicated", "Odontectomy"],
  "ENDODONTIC": ["Pulpotomy"],
  "PROSTHODONTICS": ["Complete Denture", "Removable Denture"],
  "CROWNS": ["Plastic", "Porcelain, Zirconia, Emax", "Fixed Bridge"],
  "ORTHODONTICS": ["Braces", "Retainers"]
};

let popupModal = false; // Modal state for confirmation
let selectedAppointmentId: string | null = null; // To store the selected appointment for deletion

const morningSlots = [
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", 
];

const afternoonSlots = [
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM","4:30 PM"
];

function selectTime(time: string) {
  selectedTime = time;
}

async function bookAppointment() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!selectedDate || selectedDate < today) {
    Swal.fire({
      icon: 'warning',
      title: 'Invalid Date',
      text: 'You cannot book an appointment on a past date.',
    });
    return;
  }

  if (selectedTime && patientId && selectedService) {
    try {
      // Check if the patient already has an appointment for the selected date
      const q = query(
        collection(db, "appointments"),
        where("patientId", "==", patientId),
        where("date", "==", selectedDate.toLocaleDateString()),
        where("cancellationStatus", "==", '')  // Only check appointments that are not canceled
      );
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // No appointment found for the selected date, so allow booking
        const docRef = await addDoc(collection(db, "appointments"), {
          patientId: patientId,
          date: selectedDate.toLocaleDateString(),
          time: selectedTime,
          service: selectedService,
          subServices: selectedSubServices,
          status: 'pending', // Explicitly set the status
          cancellationStatus: '', // Optional field for cancellations
        });

        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const appointmentData = docSnap.data();
          const appointment: Appointment = {
            id: docRef.id,
            date: appointmentData.date,
            time: appointmentData.time,
            patientId: appointmentData.patientId,
            service: appointmentData.service,
            subServices: appointmentData.subServices,
            cancellationStatus: appointmentData.cancellationStatus || null,
            status: appointmentData.status,
          };
          appointments.push(appointment);

          Swal.fire({
            icon: 'success',
            title: 'Appointment Booked',
            text: `Your appointment is set for ${appointment.date} at ${appointment.time}.`,
          });

          selectedTime = null;
          selectedService = null;
          selectedSubServices = [];
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No document found for the new appointment.',
          });
          console.error("No document found for the new appointment.");
        }
      } else {
        // The patient already has an appointment for the selected date
        Swal.fire({
          icon: 'info',
          title: 'Appointment Already Exists',
          text: 'You already have an appointment for this day. Please cancel your existing appointment before booking again.',
        });
      }
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Something went wrong while booking your appointment.`,
      });
      console.error("Error adding or fetching document: ", e);
    }
  } else {
    Swal.fire({
      icon: 'warning',
      title: 'Incomplete Form',
      text: 'Please select a time, service, and ensure you are logged in.',
    });
  }
}



function getAppointments() {
  if (patientId) {
    try {
      const q = query(collection(db, "appointments"), where("patientId", "==", patientId));

      // Set up a real-time listener
      onSnapshot(q, (querySnapshot) => {
        appointments = []; // Clear the array before updating
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Appointment;
          appointments.push({ ...data, id: doc.id });
        });

        // Log for debugging
        console.log("Updated appointments for patient:", appointments);
      });
    } catch (e) {
      console.error("Error fetching appointments: ", e);
    }
  }
}

async function requestCancelAppointment() {
  if (selectedAppointmentId && getSelectedReasons().length > 0) {
    try {
      const appointmentRef = doc(db, "appointments", selectedAppointmentId);

      // Update Firestore with the new status and cancellation details
      await updateDoc(appointmentRef, {
        cancellationStatus: 'requested', // Set cancellation status
        cancelReason: getSelectedReasons().join(", "), // Combine reasons into a string
        status: '' // Update the status to "requested"
      });

      // Optimistically update the local state
      appointments = appointments.map(appointment => 
        appointment.id === selectedAppointmentId 
          ? {
              ...appointment,
              cancellationStatus: 'requested',
              cancelReason: getSelectedReasons().join(", "),
              status: ''
            } 
          : appointment
      );

      // Display success message
      Swal.fire({
        icon: 'success',
        title: 'Cancellation Requested',
        text: 'Your cancellation request has been submitted successfully.',
      });
      popupModal = false; // Close the modal
    } catch (e) {
      console.error("Error requesting cancellation: ", e);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to submit the cancellation request. Please try again later.',
      });
    }
  } else {
     Swal.fire({
      icon: 'warning',
      title: 'Reason Required',
      text: 'Please select a reason for cancellation.',
    });
  }
}


function openCancelModal(appointmentId: string) {
  selectedAppointmentId = appointmentId;
  popupModal = true;
}

let appointment = {
  id: 'appointmentId', // Replace with the dynamic ID
  cancellationStatus: null,
  status: 'pending'
};

onMount(async () => {
  try {
    const appointmentRef = doc(db, "appointments", appointment.id);
    const docSnap = await getDoc(appointmentRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      appointment.cancellationStatus = data.cancellationStatus;
      appointment.status = data.status;
    } else {
      console.log("Appointment not found.");
    }
  } catch (e) {
    console.error("Error fetching appointment data: ", e);
  }
});
function isTimeSlotAvailable(slot: string, date: Date): boolean {
  const currentDate = new Date();
  const selectedDate = new Date(date);
  
  if (selectedDate < currentDate) {
    return false;
  }
  
  const dayOfWeek = selectedDate.getDay();
  if (dayOfWeek === 0) { // Sunday
    const sundaySlots = [
      ...morningSlots, ...afternoonSlots
    ];
    if (!sundaySlots.includes(slot)) {
      return false;
    }
  } else if (dayOfWeek === 6) { // Saturday
    return false;
  }

  if (selectedDate.toDateString() === currentDate.toDateString() && isTimePassed(slot)) {
    return false;
  }
  
  return true;
}

function isTimePassed(time: string): boolean {
  const currentTime = new Date();
  const [slotTime, period] = time.split(' ');
  const [hours, minutes] = slotTime.split(':').map(Number);

  let adjustedHours = hours;
  if (period === 'PM' && hours !== 12) {
    adjustedHours += 12;
  }
  if (period === 'AM' && hours === 12) {
    adjustedHours = 0;
  }

  const slotDateTime = new Date();
  slotDateTime.setHours(adjustedHours, minutes, 0, 0);

  return slotDateTime < currentTime;
}

onMount(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      patientId = user.uid;
      getAppointments();
    } else {
      patientId = null;
      alert("Please log in to book an appointment.");
    }
  });
});

// Handle sub-service selection
function toggleSubService(subService: string) {
  if (selectedSubServices.includes(subService)) {
    selectedSubServices = selectedSubServices.filter(item => item !== subService);
  } else {
    selectedSubServices.push(subService);
  }
}
function fetchAppointments() {
  try {
    const appointmentsRef = collection(db, "appointments");

    // Set up a real-time listener
    onSnapshot(appointmentsRef, (querySnapshot) => {
      appointments = []; // Clear the array before updating
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Appointment;
        appointments.push({
          ...data,
          id: doc.id,
          status: data.status || "",
        });
      });

      // Log to verify real-time updates
      console.log("Updated appointments:", appointments);
    });
  } catch (error) {
    console.error("Error fetching appointments: ", error);
  }
}

</script>

<style>
  .booked {
    background-color: #cbd5e1;
    cursor: not-allowed;
  }

  .slot-button {
    width: 100%;
  }

  .slots-container {
    max-height: 300px; /* Adjust the height as needed */
     /* Enables vertical scrolling */
  }

  .appointments-section {
    margin-top: 30px;
    background-color: #f9fafb;
    padding: 10px;
    border-radius: 8px;
    max-height: 300px; /* Adjust the height as needed */
    /* Enables vertical scrolling */
  }


 
  /* Hide the scrollbar */
  div::-webkit-scrollbar {
    display: none;
  }

  div {
    -ms-overflow-style: none;  /* For Internet Explorer and Edge */
    scrollbar-width: none;      /* For Firefox */
  }
  @media (max-width: 768px) {
    .flex {
      flex-direction: column; /* Stack the elements vertically on small screens */
      align-items: center;
      text-align: center;
    }

    .w-24 {
      width: 100px; /* Adjust logo size on small screens */
    }

    .text-lg {
      font-size: 18px; /* Adjust font size for headings */
    }

    .text-sm {
      font-size: 14px; /* Adjust font size for smaller text */
    }
  }
  @media (max-width: 768px) {
    .slots-container .grid {
      grid-template-columns: repeat(2, 1fr); /* Adjust grid layout on smaller screens */
    }

    .text-sm {
      font-size: 14px; /* Smaller text on mobile */
    }

    .slot-button {
      padding: 8px 12px; /* Adjust padding for smaller buttons */
    }
  }
  :global(.content) {
       
        overflow: auto;
    }

</style>


<header style="
  
  margin-top: 3%;
  
">
  <div class="flex justify-between items-center">
    <div class="flex items-center">
      <img 
        src="/images/logo(landing).png" 
        alt="Sun with dental logo" 
        class="w-24 h-18 mr-4" 
        style="max-width: 100%; height: auto;" 
      />
      <div>
        <h1 class="font-bold text-lg text-indigo-600">AF DOMINIC</h1>
        <p class="text-sm text-gray-700">DENTAL CLINIC</p>
        <p class="text-sm text-gray-600">#46 12th Street, Corner Gordon Ave New Kalalake</p>
        <p class="text-sm text-gray-600">afdominicdentalclinic@gmail.com</p>
        <p class="text-sm text-gray-600">0932 984 9554</p>
      </div>
    </div>

</header>


<div
  style="
    display: flex; 
    justify-content: space-between; 
    gap: 20px; 
    padding: 40px; 
    width: 100%; 
    max-width: 1200px; 
    margin: 50px auto; 
    margin-top: 3%; 
    margin-bottom: 50px; 
    max-height: 85vh; 
    flex-wrap: wrap;
    "
    
>
<div
  style="
    flex: 1; 
    padding: 20px; 
    margin-top: -40px; /* Adjusted margin to reduce space on top */
    border: 1px solid #ddd; 
    border-radius: 0.75rem; 
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); 
    background-color: #fff;
    transition: box-shadow 0.3s ease;
  "
>
  <!-- Left Section (Form) -->
  <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #333;">Book Appointment</h3>

  <div
    style="
      flex: 1 1 45%; 
      min-width: 300px; 
      min-height: 400px; 
      transform: scale(0.95); /* Slightly reduced scale for better fit */
      margin-top: -10px; /* Reduced margin to better space elements */
    "
  >
    <!-- Datepicker Section -->
    <div class="mb-4">
      <label for="datepicker" class="block text-sm font-medium text-gray-700">Select Date</label>
      <div id="datepicker-wrapper">
        <Datepicker bind:value={selectedDate} color="red" />
      </div>
    </div>

    <!-- Service Selection Dropdown -->
    <div class="mb-4">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block text-sm font-medium text-gray-700">Select Service</label>
      <select bind:value={selectedService} class="block w-full border border-gray-700 rounded-md shadow-sm p-2">
        <option value="" disabled>Select a service</option>
        {#each services as service}
          <option value={service}>{service}</option>
        {/each}
      </select>
    </div>

    <!-- Sub-Service Selection Checkboxes -->
    {#if selectedService && subServices[selectedService]}
      <div class="mt-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-sm font-medium text-gray-700">Sub-services</label>
        {#each subServices[selectedService] as subService}
          <div class="flex items-center">
            <Checkbox id={subService} value={subService} on:change={() => toggleSubService(subService)} />
            <label for={subService} class="ml-2">{subService}</label>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Time Slot Section -->
    <div class="mb-6">
      <!-- Morning Time Slots -->
      <div class="flex items-center mb-4">
        <img alt="Morning icon" class="mr-2" height="24" src="https://storage.googleapis.com/a1aa/image/GIyR3HKfMp1fDkqFrYulwbIHaTApWH3YPZDJuQDrFo5lwM5TA.jpg" width="24" />
        <div>
          <div class="text-gray-700 font-semibold">Morning Hours</div>
          <div class="text-gray-500 text-sm">Monday to Friday: 8:00 AM to 12:00 PM | Sunday: 8:00 AM to 12:00 AM | Saturday: Day Off</div>
        </div>
      </div>

      <div class="slots-container">
        <div class="grid grid-cols-4 gap-4">
          {#each morningSlots as slot}
            <button
              class="slot-button border border-gray-300 text-gray-700 hover:bg-blue-100"
              class:booked={!isTimeSlotAvailable(slot, selectedDate)}
              on:click={() => isTimeSlotAvailable(slot, selectedDate) && selectTime(slot)}
              disabled={!isTimeSlotAvailable(slot, selectedDate)}
              style="padding: 10px; border-radius: 4px; transition: background-color 0.2s ease;"
            >
              {slot}
            </button>
          {/each}
        </div>
      </div>

      <!-- Afternoon Time Slots -->
      <div class="mb-4">
        <div class="flex items-center mb-4">
          <img alt="Afternoon icon" class="mr-2" height="24" src="https://cdn.dribbble.com/users/128741/screenshots/710759/afternoon.png" width="24" />
          <div>
            <div class="text-gray-700 font-semibold">Afternoon Hours</div>
            <div class="text-gray-500 text-sm">Monday to Friday: 1:00 PM to 5:00 PM | Sunday: 1:00 PM to 4:00 PM | Saturday: Day Off</div>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-4">
          {#each afternoonSlots as slot}
            <button
              class="slot-button border border-gray-300 text-gray-700 hover:bg-blue-100"
              class:booked={!isTimeSlotAvailable(slot, selectedDate)}
              on:click={() => isTimeSlotAvailable(slot, selectedDate) && selectTime(slot)}
              disabled={!isTimeSlotAvailable(slot, selectedDate)}
              style="padding: 10px; border-radius: 4px; transition: background-color 0.2s ease;"
            >
              {slot}
            </button>
          {/each}
        </div>
      </div>

      {#if selectedTime}
        <div class="mt-4 text-gray-700">
          <p>You have selected: <span class="font-semibold">{selectedTime}</span></p>
          <button on:click={bookAppointment} class="mt-4 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Book Appointment
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
  <div
    style="
      flex: 1; 
      padding: 10px; 
      margin-top: -40px;
      border: 1px solid #ddd; 
      border-radius: 0.5rem; 
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); 
      background-color: #fff; 
      overflow: hidden;
      margin-bottom: 0px; /* No margin-bottom here */
    "
  >
    <h3 style="font-size: 18px; font-weight: bold; ">Your Appointments</h3>
  
  <!-- Right Section (Appointments Table) -->
  <div style="flex: 1 1 45%; min-width: 300px; margin-top: 10px; ">
    {#if appointments.length > 0}
      <div style=" margin-bottom: 20px;">
        <Table shadow style="width: 100%; table-layout: auto; border-collapse: collapse;">
          <TableHead>
            <TableHeadCell style="font-weight: bold; padding: 10px;">Date</TableHeadCell>
            <TableHeadCell style="font-weight: bold; padding: 5px;">Time</TableHeadCell>
            <TableHeadCell style="font-weight: bold; padding: 5px;">Service</TableHeadCell>
            <TableHeadCell style="font-weight: bold; padding: 10px;">Status</TableHeadCell>
            <TableHeadCell style="font-weight: bold; padding: 5px;">Actions</TableHeadCell>
          </TableHead>
          
          <TableBody tableBodyClass="divide-y">
            {#each appointments as appointment}
              <TableBodyRow class={appointment.cancellationStatus === 'requested' ? 'opacity-50' : ''} style="padding: 10px;">
                <TableBodyCell style="padding: 10px; word-wrap: break-word; white-space: normal;">
                  {appointment.date}
                </TableBodyCell>
                <TableBodyCell style="padding: 5px;">
                  {appointment.time}
                </TableBodyCell>
                <TableBodyCell style="padding: 10px; word-wrap: break-word; white-space: normal;">
                  {appointment.service}
                </TableBodyCell>
                <TableBodyCell style="padding: 5px; word-wrap: break-word; white-space: normal;">
                  {#if appointment.cancellationStatus === 'requested'}
                    <span class="text-yellow-600 font-semibold">Cancellation Requested</span>
                  {:else if appointment.cancellationStatus === 'Approved'}
                    <span class="text-red-600 font-semibold">Cancelled</span>
                  {:else if appointment.cancellationStatus === 'Decline'}
                    <span class="text-red-600 font-semibold">Cancellation Declined</span>
                  {:else if appointment.status === 'Accepted'}
                    <span class="text-green-600 font-semibold">Accepted</span>
                  {:else if appointment.status === 'confirmed'}
                    <span class="text-blue-600 font-semibold">Confirmed</span>
                  {:else if appointment.status === 'Completed'}
                    <span class="text-blue-600 font-semibold">Completed</span>
                  {:else if appointment.status === 'Decline'}
                    <span class="text-red-600 font-semibold">Declined</span>
                    {:else if appointment.status === 'Missed'}
                    <span class="text-red-600 font-semibold">Missed</span>
                  {:else if appointment.status === 'pending'}
                    <span class="text-gray-600 font-semibold">Pending</span>
                 
                  {:else if appointment.status === 'cancellationRequested'}
                    <span class="text-yellow-600 font-semibold">Cancellation Requested</span>
                  {:else}
                    <span class="text-gray-600 font-semibold">Unknown Status</span>
                  {/if}
                </TableBodyCell>
                
                <TableBodyCell style="padding: 5px;">
                  {#if appointment.cancellationStatus !== 'requested'}
                  <Button
                  on:click={() => openCancelModal(appointment.id)}
                  style="
                    
                  "
                  class="cancel-button"
                >
                   <CloseCircleOutline 
                     class="w-6 h-6" 
                          style="color: red;" 
                             />

                </Button>
                
                  {/if}
                </TableBodyCell>
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
        
      </div>
    {:else}
      <div class="appointments-section">
        <p style="
          font-style: italic; 
          color: #555; 
          font-size: 16px;
          text-align: center;
        ">No appointments found. Book an appointment to see it here!</p>
      </div>
    {/if}
  </div>
</div>
</div>

  <!-- Confirmation Modal for CANCELATION Appointment -->
  <Modal bind:open={popupModal} size="xs" autoclose>
    <div class="text-center">
      <ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" />
      <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
        Are you sure you want to request cancellation for this appointment?
      </h3>
      <!-- Add checklist for cancellation reasons -->
      <div class="mb-4 text-left">
        <p class="text-gray-600">Reason for Cancellation:</p>
        <div>
          <label class="block">
            <input type="checkbox" bind:checked={reasonNotAvailable} /> 
            Service is no longer needed
          </label>
          <label class="block">
            <input type="checkbox" bind:checked={reasonSchedulingConflict} />
            Scheduling conflict
          </label>
          <label class="block">
            <input type="checkbox" bind:checked={reasonOther} />
            Other
          </label>
        </div>
      </div>
      <div>
        <Button color="red" class="me-2" on:click={requestCancelAppointment}>Yes, Request Cancellation</Button>
        <Button color="alternative" on:click={() => (popupModal = false)}>No, Keep Appointment</Button>
      </div>
    </div>
  </Modal>



