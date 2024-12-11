<script lang="ts">
  import { Datepicker } from 'flowbite-svelte';
  import { onMount } from "svelte";
  import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, where } from "firebase/firestore";
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
  };

  let selectedDate = new Date();
  let selectedTime: string | null = null;
  let appointments: Appointment[] = [];
  let patientId: string | null = null;

  let popupModal = false; // Modal state for confirmation
  let selectedAppointmentId: string | null = null; // To store the selected appointment for deletion

  const morningSlots = [
    "9:00 AM", "9:10 AM", "9:20 AM", "9:30 AM", "9:40 AM", "9:50 AM", "10:00 AM", "10:10 AM", "10:20 AM", 
    "10:30 AM", "10:40 AM", "10:50 AM",
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

  async function deleteAppointment() {
    if (selectedAppointmentId) {
      try {
        await deleteDoc(doc(db, "appointments", selectedAppointmentId));
        appointments = appointments.filter(appointment => appointment.id !== selectedAppointmentId);
        alert("Appointment deleted.");
        popupModal = false; // Close modal after deleting
      } catch (e) {
        console.error("Error deleting appointment: ", e);
        alert("Failed to delete appointment.");
      }
    }
  }

  function openDeleteModal(appointmentId: string) {
    selectedAppointmentId = appointmentId;
    popupModal = true;
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
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
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
  <div class="bg-white p-6 rounded-lg shadow-md w-full lg:w-2/3">
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
          <div class="text-gray-700 font-semibold">Morning</div>
          <div class="text-gray-500 text-sm">9:00 AM to 12:00 PM</div>
        </div>
      </div>

      <div class="slots-container">
        <div class="grid grid-cols-4 gap-4">
          {#each morningSlots as slot}
            <button
              class="slot-button border border-gray-300 text-gray-700"
              class:selected={selectedTime === slot}
              on:click={() => selectTime(slot)}
              class:booked={appointments.some(appointment => appointment.time === slot && appointment.date === selectedDate.toLocaleDateString())}
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
      <div class="appointment-item">
        <div>
          <p><strong>Date:</strong> {appointment.date}</p>
          <p><strong>Time:</strong> {appointment.time}</p>
        </div>
        <Button
          on:click={() => openDeleteModal(appointment.id)}
          style="background-color: #ff4747; color: white; padding: 5px 10px; border: none; border-radius: 5px; cursor: pointer;"
          class="delete-button"
        >
          <CloseOutline class="w-6 h-6 text-white" />
        </Button>
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
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">Are you sure you want to cancel this appointment?</h3>
    <div>
      <Button color="red" class="me-2" on:click={deleteAppointment}>Yes, I'm sure</Button>
      <Button color="alternative" on:click={() => (popupModal = false)}>No, cancel</Button>
    </div>
  </div>
</Modal>
