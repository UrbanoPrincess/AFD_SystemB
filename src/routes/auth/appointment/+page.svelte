<script lang="ts">
  import { Checkbox} from 'flowbite-svelte';
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
import { runTransaction } from "firebase/firestore";


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
  cancellationStatus?: 'pending' | 'Approved' | 'decline' | 'requested' | null;
  status: "pending" | "Decline"| "Missed"  | "confirmed" | "Completed" | "cancelled" | "Accepted" | "Reschedule Requested" | "Rescheduled" |"Scheduled" |"Completed: Need Follow-up" |"cancellationRequested" | "";
};

let selectedDate = new Date().toISOString().split('T')[0]; // Initialize with today's date in YYYY-MM-DD format
let selectedTime: string | null = null;
let selectedService: string | null = null;
let selectedSubServices: string[] = []; // Array to hold selected sub-services
let appointments: Appointment[] = [];
let patientId: string | null = null;
let reasonNotAvailable = false;
let activeTab: 'upcoming' | 'past' = 'upcoming'; // Track the active tab
  let upcomingAppointments: Appointment[] = [];
  let pastAppointments: Appointment[] = [];

  let reasonSchedulingConflict = false;
  let reasonOther = false;
  let rescheduleModal: boolean = false;
  let newDate: string = "";
  let newTime: string = "";
  let currentSchedule = { date: "", time: "" };
  let currentAppointment: Appointment | null = null;

   // Trigger tab switch
   function switchTab(tab: 'upcoming' | 'past') {
    activeTab = tab;
  }

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
    "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  ];

  let availableSlots = [...morningSlots, ...afternoonSlots];

  // Fetch available slots when date changes
$: fetchAvailableSlots();

async function fetchAvailableSlots() {
  if (!newDate) return;

  try {
    const q = query(
      collection(db, "appointments"),
      where("date", "==", newDate),
      where("cancellationStatus", "==", "")
    );

    const querySnapshot = await getDocs(q);
    const unavailableSlots = querySnapshot.docs
      .filter((doc) => {
        const status = doc.data().status;
        return (
          status === "Accepted" ||
          status === "accepted" ||
          status === "Pending" ||
          status === "pending"
        ); // Filter all four variations of the status
      })
      .map((doc) => doc.data().time);

    // Filter out the unavailable slots from the available slots
    availableSlots = [...morningSlots, ...afternoonSlots].filter(
      (slot) => !unavailableSlots.includes(slot)
    );
  } catch (error) {
    console.error("Error fetching available slots:", error);
  }
}


function selectTime(time: string) {
  selectedTime = time;
}

async function bookAppointment() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDateObj = new Date(selectedDate);

  // Validate the selected date
  if (!selectedDate || selectedDateObj < today) {
    Swal.fire({
      icon: 'warning',
      title: 'Invalid Date',
      text: 'You cannot book an appointment on a past date.',
    });
    return;
  }

  // Validate required fields
  if (!selectedTime || !patientId || !selectedService) {
    Swal.fire({
      icon: 'warning',
      title: 'Incomplete Form',
      text: 'Please select a time, service, and ensure you are logged in.',
    });
    return;
  }

  try {
    // Firestore transaction to ensure atomic operations
    await runTransaction(db, async (transaction) => {
      // Check if the selected time slot is already taken
      const slotQuery = query(
        collection(db, "appointments"),
        where("date", "==", selectedDate),
        where("time", "==", selectedTime),
        where("status", "in", ["pending", "Pending", "Accepted", "accepted"]),
        where("cancellationStatus", "==", "") // Exclude canceled appointments
      );

      const slotSnapshot = await getDocs(slotQuery);
      if (!slotSnapshot.empty) {
        Swal.fire({
          icon: 'error',
          title: 'Time Slot Unavailable',
          text: 'This time slot is already booked. Please choose a different time.',
        });
        return;
      }

      // Check if the user already has an appointment on the same date
      const userQuery = query(
        collection(db, "appointments"),
        where("patientId", "==", patientId),
        where("date", "==", selectedDate),
        where("status", "in", ["pending", "Pending", "Accepted", "accepted"])
      );

      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        Swal.fire({
          icon: 'error',
          title: 'Already Booked',
          text: 'You already have an appointment on this date. Please choose another date.',
        });
        return;
      }

      // Ensure the patient has a valid profile
      if (!patientId) {
        throw new Error("Patient ID is null");
      }
      const profileDocRef = doc(db, "patientProfiles", patientId);
      const profileDocSnap = await transaction.get(profileDocRef);

      if (!profileDocSnap.exists()) {
        throw new Error("Profile Not Found");
      }

      // Create a new appointment entry
      const appointmentRef = doc(collection(db, "appointments"));
      transaction.set(appointmentRef, {
        patientId: patientId,
        date: selectedDate,
        time: selectedTime,
        service: selectedService,
        subServices: selectedSubServices || [],
        status: 'pending',
        cancellationStatus: '', // Empty cancellation status for new bookings
      });

      // Notify the user of success
      Swal.fire({
        icon: 'success',
        title: 'Appointment Pending',
        text: `Your appointment is pending for ${selectedDate} at ${selectedTime}. Please wait for confirmation.`,
      });

      // Clear selections after successful booking
      selectedTime = null;
      selectedService = null;
      selectedSubServices = [];
    });
  } catch (error) {
    // Handle errors during booking
    Swal.fire({
      icon: 'error',
      title: (error instanceof Error ? error.message : 'Error'),
      text: 'An issue occurred while booking your appointment. Please try again.',
    });
    console.error("Error during booking:", error);
  }
}



function getMinDate(): string {
  const today = new Date();
  today.setDate(today.getDate() + 3); // Add 3 days to today's date

  // If the resulting day is Saturday (6), skip to Monday
  if (today.getDay() === 6) {
    today.setDate(today.getDate() + 2); // Add 2 days to skip to Monday
  }

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`; // Format as YYYY-MM-DD
}
let notifiedAppointments: Set<string> = new Set(); // Track notified appointments by ID

// Check if notifications were already shown for the user using localStorage
const checkNotificationsState = () => {
  const state = localStorage.getItem("notifiedAppointments");
  if (state) {
    return new Set<string>(JSON.parse(state)); // Explicitly cast the parsed value to Set<string>
  }
  return new Set<string>();
};

// Save the notified appointments state to localStorage
const updateNotificationsState = () => {
  localStorage.setItem("notifiedAppointments", JSON.stringify(Array.from(notifiedAppointments)));
};

function getAppointments() {
  if (patientId) {
    try {
      const today = new Date();
      const todayISOString = today.toISOString().split("T")[0]; // YYYY-MM-DD format

      const q = query(collection(db, "appointments"), where("patientId", "==", patientId));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        upcomingAppointments = [];
        pastAppointments = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data() as Appointment;
          const appointmentDate = data.date;

          const appointmentWithId: Appointment = { ...data, id: doc.id };

          if (appointmentDate >= todayISOString) {
            upcomingAppointments.push(appointmentWithId);
          } else {
            pastAppointments.push(appointmentWithId);
          }
        });

        console.log("Upcoming Appointments:", upcomingAppointments);
        console.log("Past Appointments:", pastAppointments);

        // ✅ Notification Check
        upcomingAppointments.forEach((appointment) => {
          // Only show notifications if not already notified
          if (appointment.status === "Accepted" && !notifiedAppointments.has(appointment.id)) {
            // Send confirmation notification when the appointment is accepted, but only once
            Swal.fire({
              icon: "success",
              title: "Appointment Confirmed",
              text: `Your appointment on ${appointment.date} at ${appointment.time} has been confirmed!`,
            });

            // Add the appointment ID to the notified set to prevent showing the notification again
            notifiedAppointments.add(appointment.id);
          }

          // Check if the appointment is nearing (e.g., within 1 day of the appointment)
          const appointmentDateObj = new Date(appointment.date);
          const timeDiff = appointmentDateObj.getTime() - today.getTime();
          const oneDayInMillis = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

          if (timeDiff <= oneDayInMillis && !notifiedAppointments.has(appointment.id)) {
            // Send reminder notification when the appointment is close, but only once
            Swal.fire({
              icon: "info",
              title: "Appointment Reminder",
              text: `Your appointment is tomorrow, on ${appointment.date} at ${appointment.time}.`,
            });

            // Add the appointment ID to the notified set to prevent showing the notification again
            notifiedAppointments.add(appointment.id);
          }
        });

        // Save the updated notified appointments state
        updateNotificationsState();
      });

      return unsubscribe;
    } catch (e) {
      console.error("Error setting up real-time listener for appointments:", e);
    }
  } else {
    console.log("Patient ID not found.");
  }
}

onMount(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      patientId = user.uid;
      notifiedAppointments = checkNotificationsState(); // Load the state of notifications from localStorage
      getAppointments(); // Start the Firestore listener
    }
  });
});


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

onMount(() => {
  try {
    // Check if we have an appointment available before trying to fetch details
    if (upcomingAppointments.length > 0) {
      const appointment = upcomingAppointments[0]; // Use the first upcoming appointment

      const appointmentRef = doc(db, "appointments", appointment.id);

      // Listen for real-time updates
      const unsubscribe = onSnapshot(appointmentRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Update the appointment object with the new data
          appointment.cancellationStatus = data.cancellationStatus;
          appointment.status = data.status;
          console.log("Updated appointment:", appointment);

          // 🔔 Show notification when appointment status updates
          if (data.status === "Accepted") {
            Swal.fire({
              icon: "success",
              title: "Appointment Confirmed",
              text: `Your appointment on ${data.date} at ${data.time} has been confirmed!`,
            });
          } else if (data.status === "Rejected") {
            Swal.fire({
              icon: "error",
              title: "Appointment Rejected",
              text: `Your appointment on ${data.date} at ${data.time} was rejected. Please book another slot.`,
            });
          }
        } else {
          console.log("Appointment not found.");
        }
      });

      // Optional: Cleanup the listener when the component unmounts
      return () => unsubscribe();
    } else {
      console.log("No upcoming appointments available to fetch details.");
    }
  } catch (e) {
    console.error("Error setting up real-time listener: ", e);
  }
});


function isTimeSlotAvailable(slot: string, date: string): boolean {
  const currentDate = new Date();
  const selectedDate = new Date(date); // Convert the string date to a Date object
  
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

function openRescheduleModal(appointmentId: string): void { 
  // Find the appointment details by ID
  currentAppointment = upcomingAppointments.find(appointment => appointment.id === appointmentId) || null;

  if (currentAppointment) {
    newDate = currentAppointment.date; // Set the current date as default
    newTime = currentAppointment.time; // Set the current time as default
  }

  selectedAppointmentId = appointmentId;
  rescheduleModal = true;
}



async function rescheduleAppointment(newDate: string, newTime: string): Promise<void> {
  if (!newDate || !newTime) {
    Swal.fire({
      icon: "warning",
      title: "Incomplete Details",
      text: "Please select a new date and time for rescheduling.",
    });
    return;
  }

  if (!selectedAppointmentId) {
    console.error("No appointment ID selected for rescheduling.");
    return;
  }

  // Check if currentAppointment is not null before accessing its properties
  if (currentAppointment && currentAppointment.date === newDate && currentAppointment.time === newTime) {
    Swal.fire({
      icon: "warning",
      title: "No Change Detected",
      text: "The selected date and time are the same as your current schedule. Please choose a different date or time.",
    });
    return;
  }

  const selectedDateObj = new Date(newDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Block selecting past dates
  const currentAppointmentDate = new Date(currentAppointment?.date || '');
  if (selectedDateObj < today || selectedDateObj < currentAppointmentDate) {
    Swal.fire({
      icon: "warning",
      title: "Invalid Date",
      text: "You cannot reschedule to a past date or a date before your current appointment.",
    });
    return;
  }

  try {
    // Check if the time slot is already occupied
    const q = query(
      collection(db, "appointments"),
      where("date", "==", newDate),
      where("time", "==", newTime),
      where("cancellationStatus", "==", "")
    );

    const querySnapshot = await getDocs(q);
    const existingAppointment = querySnapshot.docs.find(
      (doc) => doc.data().status === "Accepted" || doc.data().status === "pending"
    );

    if (existingAppointment) {
      Swal.fire({
        icon: "info",
        title: "Time Slot Unavailable",
        text: "This time slot is already booked or pending. Please choose a different time.",
      });
      return;
    }

    // Mark the appointment as "Reschedule Requested"
    const appointmentRef = doc(collection(db, "appointments"), selectedAppointmentId);

    await updateDoc(appointmentRef, {
      status: "Reschedule Requested",
      requestedDate: newDate,
      requestedTime: newTime,
    });

    Swal.fire({
      icon: "success",
      title: "Reschedule Requested",
      text: `Your reschedule request for ${newDate} at ${newTime} has been submitted. Please wait for approval.`,
    });

    rescheduleModal = false;
  } catch (error) {
    console.error("Error submitting reschedule request:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to submit reschedule request. Please try again.",
    });
  }
}


</script>


<div style="max-height: 100vh; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none;">

 

  <div class="responsive-container">
<div class="responsive-card">
<!-- Left Section (Form) -->
<h3 style="font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #333;">Book Appointment</h3>

<div style="flex: 1 1 45%; min-width: auto; min-height: 400px; margin-top: -10px;">
  <!-- Datepicker Section -->
  <div class="mb-4">
    <label for="datepicker" class="block text-sm font-medium text-gray-700">Select Date</label>
    <div id="datepicker-wrapper">
      <input 
        type="date" 
        id="datepicker" 
        bind:value={selectedDate} 
        class="block w-full border border-gray-700 rounded-md shadow-sm p-2" 
        min={getMinDate()} 
      />
    </div>
  </div>

  <!-- Service Selection Dropdown -->
  <div class="mb-4">
    <label for="service-select" class="block text-sm font-medium text-gray-700">Select Service</label>
    <select id="service-select" bind:value={selectedService} class="block w-full border border-gray-700 rounded-md shadow-sm p-2">
      <option value="" disabled>Select a service</option>
      {#each services as service}
        <option value={service}>{service}</option>
      {/each}
    </select>
  </div>

  <!-- Sub-Service Selection Checkboxes -->
  {#if selectedService && subServices[selectedService]}
    <div class="mt-2">
      <label for="sub-services" class="block text-sm font-medium text-gray-700">Sub-services</label>
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
      <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2">

        {#each morningSlots as slot}
          <button
            class="slot-button border border-gray-300 text-gray-700 hover:bg-blue-100 px-2 py-1 rounded transition duration-200"
            class:booked={!isTimeSlotAvailable(slot, selectedDate)}
            class:selected={selectedTime === slot}
            on:click={() => isTimeSlotAvailable(slot, selectedDate) && selectTime(slot)}
            disabled={!isTimeSlotAvailable(slot, selectedDate)}
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

      <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {#each afternoonSlots as slot}
        <button
        class="slot-button border border-gray-300 text-gray-700 hover:bg-blue-100 px-2 py-1 rounded transition duration-200"
        class:booked={!isTimeSlotAvailable(slot, selectedDate)}
        class:selected={selectedTime === slot}
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
        <button
          on:click={() => bookAppointment()}
          class="mt-4 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Book Appointment
        </button>
      </div>
    {/if}
  </div>
</div>
</div>
<div class="responsive-card">
<h3 style="font-size: 18px; font-weight: bold;">Your Appointments</h3>

<!-- Tabs Navigation -->
<div style="display: flex; margin-top: 20px; border-bottom: 1px solid #ddd;">
  <button
  on:click={() => switchTab('upcoming')}
  class="tab-button"
  style="flex: 1; padding: 10px; font-weight: regular; border: none; background: none; cursor: pointer;"
  class:active-tab={activeTab === 'upcoming'}
>
  Upcoming
</button>
<button
  on:click={() => switchTab('past')}
  class="tab-button"
  style="flex: 1; padding: 10px; font-weight: regular; border: none; background: none; cursor: pointer;"
  class:active-tab={activeTab === 'past'}
>
  Past
</button>
</div>

<!-- Tabs Content -->
<div>
  {#if activeTab === 'upcoming'}
  <div class="flex flex-wrap gap-4 justify-center mt-5">
    {#if upcomingAppointments.length > 0}
      {#each upcomingAppointments as appointment}
        <div class="bg-white shadow-lg rounded-lg p-4 w-full max-w-sm border border-gray-300">
          <div class="mb-2">
            <p class="font-bold text-lg text-blue-600">{appointment.date} </p>
            <p class="font-bold text-lg text-blue-600"> {appointment.time}</p>
            <p class="text-gray-700 font-semibold">{appointment.service}</p>
          </div>
          <div class="mb-2">
            <!-- Status Handling -->
            {#if appointment.cancellationStatus === 'requested'}
              <span class="text-yellow-600 font-semibold">Cancellation Requested</span>
            {:else if appointment.cancellationStatus === 'Approved'}
              <span class="text-red-600 font-semibold">Cancelled</span>
            {:else if appointment.cancellationStatus === 'decline'}
              <span class="text-red-600 font-semibold">Appointment Declined</span>
            {:else if appointment.status === 'Reschedule Requested'}
              <span class="text-purple-600 font-semibold">Reschedule Requested</span>
            {:else if appointment.status === 'Rescheduled'}
              <span class="text-blue-600 font-semibold">Reschedule Accepted</span>
            {:else if appointment.status === 'Completed: Need Follow-up'}
              <span class="text-blue-600 font-semibold">Completed: With Follow-up</span>
            {:else if appointment.status === 'Scheduled'}
              <span class="text-blue-600 font-semibold">Follow-up Appointment</span>
            {:else if appointment.status === 'Accepted'}
              <span class="text-green-600 font-semibold">Accepted</span>
            {:else if appointment.status === 'Completed'}
              <span class="text-blue-600 font-semibold">Completed</span>
            {:else if appointment.status === 'Missed'}
              <span class="text-orange-600 font-semibold">Missed</span>
            {:else if appointment.status === 'Decline'}
              <span class="text-red-600 font-semibold">Cancellation Declined</span>
            {:else if appointment.status === 'pending'}
              <span class="text-yellow-600 font-semibold">Pending</span>
            {:else if appointment.status === 'confirmed'}
              <span class="text-blue-600 font-semibold">Confirmed</span>
            {:else}
              <span class="text-gray-600 font-semibold">Unknown Status</span>
            {/if}
          </div>
          <div class="flex justify-end gap-2">
            {#if appointment.status === 'Accepted' && appointment.cancellationStatus !== 'Approved'}
              <button 
                on:click={() => openRescheduleModal(appointment.id)} 
                class="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm"
              >
                Reschedule
              </button>
            {/if}

            {#if appointment.status === 'pending' && appointment.cancellationStatus !== 'requested'}
              <button 
                on:click={() => openCancelModal(appointment.id)} 
                class="bg-red-500 text-white px-3 py-1 rounded-lg text-sm"
              >
                Cancel
              </button>
            {/if}
          </div>
        </div>
      {/each}
    {:else}
      <p class="text-center text-red-500 font-semibold italic">No upcoming appointments found.</p>
    {/if}
  </div>
{/if}

{#if activeTab === 'past'}
<!-- Past Appointments Section -->
<div class="flex flex-wrap gap-4 justify-center mt-5">
  {#if pastAppointments.length > 0}
    {#each pastAppointments as appointment}
      <div class="bg-white shadow-lg rounded-lg p-4 w-full max-w-sm border border-gray-300">
        <div class="mb-2">
          <p class="font-bold text-lg text-blue-600">{appointment.date}</p>
          <p class="font-bold text-lg text-blue-600">{appointment.time}</p>
          <p class="text-gray-700 font-semibold">{appointment.service}</p>
        </div>
        <div class="mb-2">
          <!-- Status Handling for Past Appointments -->
          {#if appointment.cancellationStatus === 'requested'}
            <span class="text-yellow-600 font-semibold">Cancellation Requested</span>
          {:else if appointment.cancellationStatus === 'Approved'}
            <span class="text-red-600 font-semibold">Cancelled</span>
          {:else if appointment.cancellationStatus === 'decline'}
            <span class="text-red-600 font-semibold">Cancellation Declined</span>
          {:else if appointment.status === 'Reschedule Requested'}
            <span class="text-purple-600 font-semibold">Reschedule Requested</span>
          {:else if appointment.status === 'Rescheduled'}
            <span class="text-blue-600 font-semibold">Reschedule Accepted</span>
          {:else if appointment.status === 'Completed: Need Follow-up'}
            <span class="text-blue-600 font-semibold">Completed: With Follow-up</span>
          {:else if appointment.status === 'Accepted'}
            <span class="text-green-600 font-semibold">Accepted</span>
          {:else if appointment.status === 'Completed'}
            <span class="text-blue-600 font-semibold">Completed</span>
          {:else if appointment.status === 'Missed'}
            <span class="text-orange-600 font-semibold">Missed</span>
          {:else if appointment.status === 'Decline'}
            <span class="text-red-600 font-semibold">Declined</span>
          {:else if appointment.status === 'pending'}
            <span class="text-yellow-600 font-semibold">Pending</span>
          {:else if appointment.status === 'confirmed'}
            <span class="text-blue-600 font-semibold">Confirmed</span>
          {:else if appointment.status === 'cancellationRequested'}
            <span class="text-yellow-600 font-semibold">Cancellation Requested</span>
          {:else}
            <span class="text-gray-600 font-semibold">Unknown Status</span>
          {/if}
        </div>
        <div class="flex justify-end gap-2">
          {#if appointment.status === 'Accepted' && appointment.cancellationStatus !== 'Approved'}
            <button 
              on:click={() => openRescheduleModal(appointment.id)} 
              class="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm"
            >
              Reschedule
            </button>
          {/if}

          {#if appointment.status === 'pending' && appointment.cancellationStatus !== 'requested'}
            <button 
              on:click={() => openCancelModal(appointment.id)} 
              class="bg-red-500 text-white px-3 py-1 rounded-lg text-sm"
            >
              Cancel
            </button>
          {/if}
        </div>
      </div>
    {/each}
  {:else}
    <p class="text-center text-red-500 font-semibold italic">No past appointments found.</p>
  {/if}
</div>
{/if}

</div>
</div>
</div>
</div>

    
        {#if rescheduleModal}
  <div class="modal reschedule-modal">
    <div class="modal-content">
      <h2>Request Reschedule</h2>

      <!-- Show Current Appointment Details -->
      {#if currentAppointment}
        <p><strong>Current Schedule:</strong></p>
        <p>Date: {currentAppointment.date}</p>
        <p>Time: {currentAppointment.time}</p>
      {/if}

      <!-- Select New Date -->
      <label for="newDate">Select a new date:</label>
      <input type="date" id="newDate" min={getMinDate()} bind:value={newDate} />

      <!-- Select New Time -->
      <label for="newTime">Select a new time:</label>
      <select id="newTime" bind:value={newTime}>
        <option value="" disabled selected>Select a time</option>
        {#each availableSlots as slot}
          <option value={slot}>{slot}</option>
        {/each}
      </select>

      <button class="btn btn-primary" on:click={() => rescheduleAppointment(newDate, newTime)}>
        Request Reschedule
      </button>
      <button class="btn btn-secondary" on:click={() => (rescheduleModal = false)}>
        Cancel
      </button>
    </div>
  </div>
{/if}
        
     

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

  <style>

/* Scoped styles for reschedule modal */
.reschedule-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  overflow: hidden;
}

.reschedule-modal .modal-content {
  background: #fff;
  padding: 2.5rem 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  transform: scale(0.95);
  opacity: 0;
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.reschedule-modal h2 {
  margin-bottom: 1.5rem;
  color: #333;
  font-size: 1.8rem;
  font-weight: 600;
}

.reschedule-modal p {
  font-size: 1.1rem;
  color: #444; /* Darker color for better contrast */
  font-weight: 500; /* Slightly bolder text for emphasis */
  line-height: 1.6; /* Improve readability */
}

.reschedule-modal label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.75rem;
  text-align: left;
  color: #444;
  font-size: 1.1rem;
}

.reschedule-modal input[type="date"],
.reschedule-modal select {
  width: 100%;
  padding: 0.8rem 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid #ccc;
  border-radius: 50px;
  font-size: 1rem;
  background-color: #f9f9f9;
  transition: border 0.2s ease;
}

.reschedule-modal input[type="date"]:focus,
.reschedule-modal select:focus {
  border-color: #007bff;
  outline: none;
}

.reschedule-modal button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 30px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: background 0.2s ease;
  margin-top: 0.75rem;
}

.reschedule-modal .btn-primary {
  background: #007bff;
  color: white;
}

.reschedule-modal .btn-primary:hover {
  background: #0056b3;
}

.reschedule-modal .btn-secondary {
  background: #f7f7f7;
  color: #333;
  border: 1px solid #ccc;
}

.reschedule-modal .btn-secondary:hover {
  background: #e0e0e0;
}

.reschedule-modal .btn-primary:focus,
.reschedule-modal .btn-secondary:focus {
  outline: none;
}


.responsive-card {
  flex: 1 1 45%; /* Default: Desktop layout */
  min-width: 300px;
  margin-top: 10px;
  border: 1px solid #ddd;
  border-top: 5px solid #007bff;
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  background-color: #fff;
  transition: box-shadow 0.3s ease;
  padding: 20px;
}

/* Adjustments for larger mobile devices and tablets */
@media (max-width: 768px) {
  .responsive-card {
    padding: 15px;
    margin-top: -20px; /* Reduce margin for smaller screens */
    border-radius: 0.5rem;
    max-width: 100%; /* Adjust width on smaller screens */
    
  }
}

/* Adjustments for smaller mobile devices */
@media (max-width: 480px) {
  @media (max-width: 768px) {
  .responsive-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
  }

  .responsive-card {
    flex: 1 1 100%; /* Full width sa mobile */
    min-width: auto; /* Para di sumobra sa screen */
    margin-top: 10px;
  }
}
}
/* Para sa mobile (default) */
.responsive-container {
  display: flex; 
    justify-content: space-between; 
    gap: 20px; 
    padding: 10px; 
    width: 100%; 
    margin-top: 5%; 
    margin-bottom: 50px; 
    max-height: 85vh; 
    flex-wrap: wrap;

}

/* Para sa desktop */
@media (min-width: 768px) {
    .responsive-container {
        width: 100%;
        max-width: 1200px;
        margin: 50px auto;
    }
}

  </style>