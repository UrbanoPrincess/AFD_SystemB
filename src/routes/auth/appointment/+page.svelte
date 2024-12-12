<script lang="ts">
  import { Datepicker } from 'flowbite-svelte';
  import { onMount } from "svelte";
  import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, where, updateDoc } from "firebase/firestore";
  import { initializeApp } from "firebase/app";
  import { firebaseConfig } from "$lib/firebaseConfig";
  import { getAuth, onAuthStateChanged } from "firebase/auth";
  import '@fortawesome/fontawesome-free/css/all.css';
  import { Button, Modal } from 'flowbite-svelte';
  import { ExclamationCircleOutline, CloseOutline } from 'flowbite-svelte-icons';

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  type Appointment = {
    id: string;
    date: string;
    time: string;
    patientId: string;
    cancellationStatus?: 'pending' | 'approved' | 'rejected' | null;
  };

  let selectedDate = new Date();
  let selectedTime: string | null = null;
  let appointments: Appointment[] = [];
  let patientId: string | null = null;

  let popupModal = false; // Modal state for confirmation
  let selectedAppointmentId: string | null = null; // To store the selected appointment for deletion

  const morningSlots = [
    "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", 
  ];

  const afternoonSlots = [
    "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM"
  ];

  function selectTime(time: string) {
    selectedTime = time;
  }

  async function bookAppointment() {
    if (selectedTime && patientId) {
      try {
        const docRef = await addDoc(collection(db, "appointments"), {
          patientId: patientId,
          date: selectedDate.toLocaleDateString(),
          time: selectedTime,
        });
        appointments.push({ id: docRef.id, date: selectedDate.toLocaleDateString(), time: selectedTime, patientId: patientId });
        alert(`Appointment booked on ${selectedDate.toLocaleDateString()} at ${selectedTime}`);
        selectedTime = null;
      } catch (e) {
        console.error("Error adding document: ", e);
      }
    } else {
      alert("Please select a time and ensure you're logged in.");
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
        // Update the appointment document to include cancellation request
        const appointmentRef = doc(db, "appointments", selectedAppointmentId);
        await updateDoc(appointmentRef, {
          cancellationStatus: 'pending'
        });

        // Update local state
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
    selectedAppointmentId = appointmentId;
    popupModal = true;
  }

  function isTimeSlotAvailable(slot: string, date: Date): boolean {
    const currentDate = new Date();
    const selectedDate = new Date(date);
    
    // Check if the selected date is in the past
    if (selectedDate < currentDate) {
      return false;
    }
    
    // Check for weekend restrictions
    const dayOfWeek = selectedDate.getDay();
    if (dayOfWeek === 0) { // Sunday
      // Allow slots between 8 AM and 4 PM
      const sundaySlots = [
        ...morningSlots, // All morning slots
        ...afternoonSlots // All afternoon slots
      ];
      if (!sundaySlots.includes(slot)) {
        return false;
      }
    } else if (dayOfWeek === 6) { // Saturday
      // No appointments on Saturday
      return false;
    }
    
    // If it's today's date, check if the time is in the past
    if (
      selectedDate.toDateString() === currentDate.toDateString() && 
      isTimePassed(slot)
    ) {
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
</script>

<style>
  .booked {
    background-color: #cbd5e1;
    cursor: not-allowed;
  }

  .main-container {
    margin-top: 20px; /* Optional top margin */
    max-width: 1200px; /* Ensure the container is responsive */
    width: 100%;
    margin-left: auto; /* Center the container horizontally */
    margin-right: auto;
    display: flex;
    flex-wrap: wrap; /* Handle smaller screens better */
    justify-content: center; /* Center align the items */
    gap: 20px; /* Space between sections */
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

  .appointment-item {
    margin: 5px 0;
    padding: 10px;
    background-color: #fff;
    border-radius: 5px;
    border: 1px solid #ddd;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .datepicker-container {
    max-width: 100%;
  }
</style>

<div class="flex flex-col lg:flex-row gap-6 main-container">
  <!-- Datepicker Section -->
  <div class="w-full lg:w-96 mb-4 datepicker-container">
    <Datepicker bind:value={selectedDate} color="red" />
  </div>

  <!-- Slots Section -->
  <div class="bg-white p-6 rounded-lg shadow-md w-full lg:w-5/6">
    <div class="mb-6">
      <div class="flex items-center mb-4">
        <img
          alt="Morning icon"
          class="mr-2"
          height="24"
          src="https://storage.googleapis.com/a1aa/image/GIyR3HKfMp1fDkqFrYulwbIHaTApWH3YPZDJuQDrFo5lwM5TA.jpg"
          width="24"
        />
        <div>
          <div class="text-gray-700 font-semibold">Morning Hours</div>
          <div class="text-gray-500 text-sm">
            Monday to Friday: 8:00 AM to 12:00 PM
            | Sunday: 8:00 AM to 12:00 AM
            | Saturday: Day Off
          </div>
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
          <img
            alt="Afternoon icon"
            class="mr-2"
            height="24"
            src="https://cdn.dribbble.com/users/128741/screenshots/710759/afternoon.png"
            width="24"
          />
          <div>
            <div class="text-gray-700 font-semibold">Afternoon Hours</div>
            <div class="text-gray-500 text-sm">
              Monday to Friday: 1:00 PM to 5:00 PM
              | Sunday: 1:00 PM to 4:00 PM
              | Saturday: Day Off
            </div>
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
          <button
            on:click={bookAppointment}
            class="mt-4 py-2 px-4 bg-blue-500 text-white rounded-lg"
          >
            Book Appointment
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Appointments Section -->
{#if appointments.length > 0}
<div class="appointments-section">
  <h3 class="font-semibold text-lg text-gray-700">Your Appointments</h3>
  {#each appointments as appointment}
    <div 
      class="appointment-item"
      class:opacity-50={appointment.cancellationStatus === 'pending'}
    >
      <div>
        <p><strong>Date:</strong> {appointment.date}</p>
        <p><strong>Time:</strong> {appointment.time}</p>
        {#if appointment.cancellationStatus === 'pending'}
          <p class="text-yellow-600 font-semibold">Cancellation Pending</p>
        {/if}
      </div>
      {#if appointment.cancellationStatus !== 'pending'}
        <Button
          on:click={() => openCancelModal(appointment.id)}
          style="background-color: #ff4747; color: white; padding: 5px 10px; border: none; border-radius: 5px; cursor: pointer;"
          class="delete-button"
        >
          <CloseOutline class="w-6 h-6 text-white" />
        </Button>
      {/if}
    </div>
  {/each}
</div>
{:else}
<div class="appointments-section">
  <p>No appointments found. Book an appointment to see it here!</p>
</div>
{/if}

<!-- Confirmation Modal for Deleting Appointment -->
<Modal bind:open={popupModal} size="xs" autoclose>
<div class="text-center">
  <ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" />
  <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
    Are you sure you want to request cancellation for this appointment?
  </h3>
  <div>
    <Button color="red" class="me-2" on:click={requestCancelAppointment}>Yes, Request Cancellation</Button>
    <Button color="alternative" on:click={() => (popupModal = false)}>No, Keep Appointment</Button>
  </div>
</div>
</Modal>