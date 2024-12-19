<script lang="ts">
  import { Checkbox, Datepicker } from 'flowbite-svelte';
import { onMount } from "svelte";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, where, updateDoc, getDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "$lib/firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import '@fortawesome/fontawesome-free/css/all.css';
import { Button, Modal, Dropdown, DropdownItem } from 'flowbite-svelte';
import { ExclamationCircleOutline, CloseOutline } from 'flowbite-svelte-icons';
import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
import { onSnapshot } from "firebase/firestore";


onMount(() => {
  fetchAppointments();
});
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
  cancellationStatus?: 'pending' | 'approved' | 'rejected' | null;
  status: 'pending' | 'confirmed' | 'canceled' | 'completed' | 'cancelled' | 'Accepted' | 'Declined'; // Added "Declined"
};


let selectedDate = new Date();
let selectedTime: string | null = null;
let selectedService: string | null = null;
let selectedSubServices: string[] = []; // Array to hold selected sub-services
let appointments: Appointment[] = [];
let patientId: string | null = null;
let appointmentId = "someAppointmentId";
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
let selectedAppointment: Appointment | null = null; // Track selected appointment

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
    alert("You cannot book an appointment on a past date.");
    return;
  }

  if (selectedTime && patientId && selectedService) {
    try {
      const docRef = await addDoc(collection(db, "appointments"), {
        patientId: patientId,
        date: selectedDate.toLocaleDateString(),
        time: selectedTime,
        service: selectedService,
        subServices: selectedSubServices,
        status: 'pending', // Explicitly set the status
        cancellationStatus: null, // Optional field for cancellations
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
          status: appointmentData.status, // Should now have a value
        };
        appointments.push(appointment);

        alert(`Appointment request submitted for ${appointment.date} at ${appointment.time}.`);
        selectedTime = null;
        selectedService = null;
        selectedSubServices = [];
      } else {
        console.error("No document found for the new appointment.");
      }
    } catch (e) {
      console.error("Error adding or fetching document: ", e);
    }
  } else {
    alert("Please select a time, service, and ensure you're logged in.");
  }
}


async function getAppointments() {
  if (patientId) {
    try {
      const q = query(collection(db, "appointments"), where("patientId", "==", patientId));
      const querySnapshot = await getDocs(q);
      appointments = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Appointment;
        appointments.push({ ...data, id: doc.id });
      });
    } catch (e) {
      console.error("Error fetching appointments: ", e);
    }
  }
}

async function requestCancelAppointment() {
  if (selectedAppointmentId) {
    try {
      const appointmentRef = doc(db, "appointments", selectedAppointmentId);
      await updateDoc(appointmentRef, {
        cancellationStatus: 'pending'
      });

      appointments = appointments.map(appointment => 
        appointment.id === selectedAppointmentId 
          ? { ...appointment, cancellationStatus: 'pending' } 
          : appointment
      );

      alert("Cancellation request submitted.");
      popupModal = false;
    } catch (e) {
      console.error("Error requesting cancellation: ", e);
      alert("Failed to submit cancellation request.");
    }
  }
}

function openCancelModal(appointmentId: string) {
  selectedAppointment = appointments.find(appointment => appointment.id === appointmentId) || null;
  popupModal = true;
}

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
    if (patientId) {
        const appointmentsRef = query(
            collection(db, "appointments"),
            where("patientId", "==", patientId)
        );

        onSnapshot(appointmentsRef, (querySnapshot) => {
            appointments = querySnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    date: data.date || "",
                    time: data.time || "",
                    patientId: data.patientId || "",
                    service: data.service || "",
                    subServices: data.subServices || [],
                    cancellationStatus: data.cancellationStatus || null,
                    status: data.status || "pending",
                };
            });
        });
    }
}


// Add the deleteAppointment function
async function deleteAppointment(appointmentId: string) {
  try {
    const appointmentRef = doc(db, "appointments", appointmentId);
    await deleteDoc(appointmentRef); // Delete the appointment from Firebase

    // Update the appointments list in the UI
    appointments = appointments.filter(appointment => appointment.id !== appointmentId);

    alert("Appointment has been deleted.");
  } catch (e) {
    console.error("Error deleting appointment: ", e);
    alert("Failed to delete appointment.");
  }
}
// Define an async function to handle the update
async function markAppointmentAsCompleted(appointmentId: string) {
  const appointmentRef = doc(db, "appointments", appointmentId);
  await updateDoc(appointmentRef, {
    status: 'completed'  // Mark as completed/done
  });
}

// Then call the function where necessary
markAppointmentAsCompleted(appointmentId);


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
    overflow-y: auto;  /* Enables vertical scrolling */
  }

  .appointments-section {
    margin-top: 30px;
    background-color: #f9fafb;
    padding: 10px;
    border-radius: 8px;
    max-height: 300px; /* Adjust the height as needed */
    overflow-y: auto;  /* Enables vertical scrolling */
  }


 
  /* Hide the scrollbar */
  div::-webkit-scrollbar {
    display: none;
  }

  div {
    -ms-overflow-style: none;  /* For Internet Explorer and Edge */
    scrollbar-width: none;      /* For Firefox */
  }


</style>
<div style="padding: 40px; width: 100%; max-width: 50rem; margin: 100px; margin-top: 50px; border-radius: 0.5rem; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); background-color: white; max-height: 85vh; overflow-y: auto;">

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

  <!-- Service and Datepicker Section in One Row -->
  <div class="flex flex-wrap lg:flex-nowrap gap-6">
    <!-- Service Selection Dropdown -->
    <div class="mb-4 flex-1">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block text-sm font-medium text-gray-700">Select Service</label>
      <select bind:value={selectedService} class="block w-full border border-gray-700 rounded-md shadow-sm p-2">
        <option value="" disabled>Select a service</option>
        {#each services as service}
          <option value={service}>{service}</option>
        {/each}
      </select>
    </div>

  <!-- Datepicker Section -->

  <div class="mb-4 flex-1">
  <label for="datepicker" class="block text-sm font-medium text-gray-700">Select Date</label>
  <div id="datepicker-wrapper">
    <Datepicker bind:value={selectedDate} color="red" />
  </div>
</div>
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

  <!-- Slots Section -->
  <div class="mb-6">
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
            class="slot-button border border-gray-300 text-gray-700"
            class:booked={!isTimeSlotAvailable(slot, selectedDate)}
            on:click={() => isTimeSlotAvailable(slot, selectedDate) && selectTime(slot)}
            disabled={!isTimeSlotAvailable(slot, selectedDate)}
          >
            {slot}
          </button>
        {/each}
      </div>
    </div>

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
            class="slot-button border border-gray-300 text-gray-700"
            class:booked={!isTimeSlotAvailable(slot, selectedDate)}
            on:click={() => isTimeSlotAvailable(slot, selectedDate) && selectTime(slot)}
            disabled={!isTimeSlotAvailable(slot, selectedDate)}
          >
            {slot}
          </button>
        {/each}
      </div>
    </div>

    {#if selectedTime}
      <div class="mt-4 text-gray-700">
        <p>You have selected: <span class="font-semibold">{selectedTime}</span></p>
        <button on:click={bookAppointment} class="mt-4 py-2 px-4 bg-blue-500 text-white rounded-lg">
          Book Appointment
        </button>
      </div>
    {/if}
  </div>

  <!-- Line Separator -->
  <hr class="my-6 border-t-2 border-gray-200" />
  {#if appointments.length > 0}
  <Table shadow>
    <TableHead>
      <TableHeadCell>Date</TableHeadCell>
      <TableHeadCell>Time</TableHeadCell>
      <TableHeadCell>Service</TableHeadCell>
      <TableHeadCell>Status</TableHeadCell>
      <TableHeadCell>Actions</TableHeadCell>
    </TableHead>
    <TableBody tableBodyClass="divide-y">
      {#each appointments as appointment}
      <TableBodyRow class={appointment.cancellationStatus === 'pending' ? 'opacity-50' : ''}>
        <TableBodyCell>{appointment.date}</TableBodyCell>
        <TableBodyCell>{appointment.time}</TableBodyCell>
        <TableBodyCell>{appointment.service}</TableBodyCell>
        <TableBodyCell>
          {#if appointment.status === 'completed'}
        <span class="text-blue-600 font-semibold">Completed</span>
          {:else if appointment.status === 'Accepted'}
            <span class="text-green-600 font-semibold">Accepted</span>
          {:else if appointment.status === 'Declined'}
          <span class="text-red-600 font-semibold">Declined</span>
          {:else}
          <span class="text-black-900 font-semibold">{appointment.status}</span>
          {/if}
        </TableBodyCell>
        <TableBodyCell>
          {#if appointment.cancellationStatus !== 'pending'}
            <Button
              on:click={() => openCancelModal(appointment.id)}
              style="background-color: #ff4747; color: white; padding: 5px 10px; border: none; border-radius: 5px; cursor: pointer;"
              class="delete-button"
            >
              <CloseOutline class="w-6 h-6 text-white" />
            </Button>
          {/if}
        </TableBodyCell>
      </TableBodyRow>
      
      
      {/each}
    </TableBody>
  </Table>
{:else}
  <div class="appointments-section">
    <p>No appointments found. Book an appointment to see it here!</p>
  </div>
{/if}

</div>

<!-- Confirmation Modal for Deleting Appointment -->
<Modal bind:open={popupModal} size="xs" autoclose>
  <div class="text-center">
    <ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" />
    {#if selectedAppointment?.status === 'Accepted'}
      <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
        Are you sure you want to request cancellation for this appointment?
      </h3>
      <div>
        <Button color="red" class="me-2" on:click={requestCancelAppointment}>Yes, Request Cancellation</Button>
        <Button color="alternative" on:click={() => (popupModal = false)}>No, Keep Appointment</Button>
      </div>
    {:else if selectedAppointment?.status === 'Declined'}
      <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
        Are you sure you want to delete this declined appointment?
      </h3>
      <div>
        <Button color="red" class="me-2" on:click={() => {
          if (selectedAppointment) {
            deleteAppointment(selectedAppointment.id);
          }
        }}>Yes, Delete Appointment</Button>
                <Button color="alternative" on:click={() => (popupModal = false)}>No, Keep Appointment</Button>
      </div>
    {/if}
  </div>
</Modal>
