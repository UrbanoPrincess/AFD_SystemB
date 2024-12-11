<script lang="ts">
    import { Datepicker } from 'flowbite-svelte';
    import { onMount } from "svelte";
    import { getFirestore, collection, getDocs, addDoc, query, where } from "firebase/firestore";
    import { initializeApp } from "firebase/app";
    import { firebaseConfig } from "$lib/firebaseConfig";
    import { getAuth, onAuthStateChanged } from "firebase/auth";
    import '@fortawesome/fontawesome-free/css/all.css';
  
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
  
    type Appointment = {
      date: string;
      time: string;
      patientId: string; 
    };
  
    let selectedDate = new Date();
    let selectedTime: string | null = null;
    let appointments: Appointment[] = [];
    let patientId: string | null = null;
  
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
          appointments.push({ date: selectedDate.toLocaleDateString(), time: selectedTime, patientId: patientId });
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
            appointments.push(data);
          });
        } catch (e) {
          console.error("Error fetching appointments: ", e);
        }
      }
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
  </style>
  
  <div class="flex flex-col lg:flex-row gap-6 main-container">
    <!-- Slots Section -->
    <div class="bg-white p-10 rounded-lg shadow-md w-full lg:w-4/5">
      <!-- Datepicker Section moved here -->
      <div class="w-120 mb-8">
        <Datepicker bind:value={selectedDate} color="red" />
      </div>
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
      <!-- Appointments Display Section -->
      <div class="mt-6">
        <h3 class="text-lg font-semibold">Your Appointments:</h3>
        {#if appointments.length > 0}
          <ul class="list-disc pl-5">
            {#each appointments as appointment}
              <li>{appointment.date} at {appointment.time}</li>
            {/each}
          </ul>
        {:else}
          <p class="text-gray-500">No appointments booked yet.</p>
        {/if}
      </div>
    </div>
    <!-- Removed the Datepicker container -->
  </div>
  