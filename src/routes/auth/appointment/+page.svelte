<script lang="ts">
  import { onMount } from "svelte";
  import { getFirestore, collection, getDocs, addDoc, query, where } from "firebase/firestore";
  import { initializeApp } from "firebase/app";
  import { firebaseConfig } from "$lib/firebaseConfig";
  import { getAuth, onAuthStateChanged } from "firebase/auth";
  import '@fortawesome/fontawesome-free/css/all.css';

  // Initialize Firebase app
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

  let daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  let firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();

  const morningSlots = [
    "9:00 AM", "9:10 AM", "9:20 AM", "9:30 AM", "9:40 AM", "9:50 AM", "10:00 AM", "10:10 AM", "10:20 AM", 
    "10:30 AM", "10:40 AM", "10:50 AM",
  ];

  // Select time
  function selectTime(time: string) {
    selectedTime = time;
  }

  // Navigate through months
  function navigateMonth(direction: number) {
    const newDate = new Date(selectedDate);
    newDate.setMonth(selectedDate.getMonth() + direction);
    selectedDate = newDate;
    
    daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
  }

  // Function to book appointment
  async function bookAppointment() {
    if (selectedTime && patientId) {
      try {
        // Save appointment to Firestore with patientId (uid)
        const docRef = await addDoc(collection(db, "appointments"), {
          patientId: patientId,  // Store the UID of the patient
          date: selectedDate.toLocaleDateString(),
          time: selectedTime,
        });
        console.log("Document written with ID: ", docRef.id);

        // Update local state
        appointments.push({ 
          date: selectedDate.toLocaleDateString(), 
          time: selectedTime, 
          patientId: patientId
        });
        alert(`Appointment booked on ${selectedDate.toLocaleDateString()} at ${selectedTime}`);

        // Reset selected time
        selectedTime = null;
      } catch (e) {
        console.error("Error adding document: ", e);
      }
    } else {
      alert("Please select a time and ensure you're logged in.");
    }
  }

  // Get formatted date
  function getFormattedDate(date: Date) {
    return date.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  // Fetch appointments for the current patient (using patientId)
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
        console.log(appointments);
      } catch (e) {
        console.error("Error fetching appointments: ", e);
      }
    }
  }

  // Fetch patient ID when the user logs in
  onMount(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is logged in, get the UID
        patientId = user.uid;
        console.log("Logged in as: ", patientId);
        
        // Fetch appointments for the logged-in user
        getAppointments();
      } else {
        // User is not logged in
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
    margin-top: 24px;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 5px;
    justify-items: center;
    align-items: center;
  }

  button {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8px;
    border-radius: 8px;
    font-size: 14px;
    width: 100%;
    height: 100%;
    transition: background-color 0.3s, color 0.3s; /* Smooth transition for hover */
  }

  button:hover {
    background-color: #3b82f6;
    color: white;
  }

  button:focus {
    outline: none;
  }

  .selected {
  background-color: #3b82f6;
  color: white;
  }

  .day-label, .calendar-number {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 40px;
    width: 40px;
    font-weight: bold;
  }

  .calendar-number {
    border-radius: 50;
  }

  .slot-button {
    border-radius: 8px;
    width: 100%;
    height: 40px;
  }
</style>

<!-- Main Container -->
<div class="flex flex-col lg:flex-row gap-6 main-container">
  <!-- Calendar Section -->
  <div class="bg-white p-6 rounded-lg shadow-md w-full lg:w-1/3">
    <div class="flex justify-between items-center mb-4">
      <button
        class="fas fa-chevron-left text-gray-500 cursor-pointer"
        on:click={() => navigateMonth(-1)}
        aria-label="Previous month"
      ></button>
      <span class="text-gray-700 font-semibold">{getFormattedDate(selectedDate)}</span>
      <button
        class="fas fa-chevron-right text-gray-500 cursor-pointer"
        on:click={() => navigateMonth(1)}
        aria-label="Next month"
      ></button>
    </div>

    <div class="grid grid-cols-7 gap-2 text-gray-700">
      {#each ['S', 'M', 'T', 'W', 'TH', 'F', 'S'] as day}
        <div class="day-label">{day}</div>
      {/each}
      {#each Array(firstDayOfMonth).fill('') as _}
        <div></div>
      {/each}
      <div class="calendar-grid">
        {#each Array(daysInMonth) as _, i}
          <button
            class="calendar-number py-2 px-4 hover:bg-blue-500 hover:text-white"
            class:selected={selectedDate.getDate() === (i + 1)}
            on:click={() => {
              selectedDate.setDate(i + 1);
              selectedDate = new Date(selectedDate); // force reactivity
            }}
          >
            {i + 1}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Slots Section -->
  <div class="bg-white p-6 rounded-lg shadow-md w-full lg:w-1/2">
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
  </div>
</div>
