<script>
    // @ts-nocheck
    import { Label, Input } from 'flowbite-svelte';
    import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
    import { firebaseConfig } from "$lib/firebaseConfig";
    import { initializeApp, getApps, getApp } from "firebase/app";
    import { getFirestore, doc, setDoc } from "firebase/firestore"; // Firestore imports
    import { goto } from '$app/navigation';

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app); // Initialize Firestore

    let email = '';
    let password = '';
    let confirmPassword = '';
    let registrationMessage = '';

    async function handleRegistration() {
        if (password !== confirmPassword) {
            registrationMessage = "Passwords do not match.";
            return;
        }
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Generate a unique patient ID (using user.uid or any other method)
            const patientId = `patient_${user.uid}`;

            // Save user data with a 'role' as 'userPatient' and an auto-generated patient ID
            await setDoc(doc(db, "users", user.uid), {
                patientId: patientId, // Auto-generated Patient ID
                email: user.email,
                role: 'userPatient', // Define the role for patients
                createdAt: new Date().toISOString()
            });

            registrationMessage = "Registration successful! Welcome, " + user.email;
            setTimeout(() => goto('/auth/profile'), 1500); // Adjust the redirect path
        } catch (error) {
            registrationMessage = "Registration failed: " + error.message;
        }
    }
</script>

<div class="min-h-screen bg-gradient-to-r from-[#2d3a69] to-[#334eac] flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div class="flex items-center mb-4">
            <img src="/images/lock.png" alt="Lock Icon" class="w-12 h-12 mr-4" />
            <h2 class="text-3xl font-semibold text-gray-800">PATIENT REGISTRATION</h2>
        </div>

        <!-- Email field -->
        <div class="mb-6">
            <Label for="email" class="block mb-2">Email</Label>
            <Input 
                type="email" 
                id="email" 
                placeholder="Enter your email" 
                class="border p-2 w-full" 
                bind:value={email} 
                required 
            />
        </div>

        <!-- Password field -->
        <div class="mb-6">
            <Label for="password" class="block mb-2">Password</Label>
            <Input 
                type="password" 
                id="password" 
                placeholder="Enter your password" 
                class="border p-2 w-full" 
                bind:value={password} 
                required 
            />
        </div>

        <!-- Confirm Password field -->
        <div class="mb-6">
            <Label for="confirmPassword" class="block mb-2">Confirm Password</Label>
            <Input 
                type="password" 
                id="confirmPassword" 
                placeholder="Confirm your password" 
                class="border p-2 w-full" 
                bind:value={confirmPassword} 
                required 
            />
        </div>

        <!-- Register button -->
        <div class="mb-6">
            <button 
                type="submit" 
                class="w-full p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                on:click={handleRegistration}
            >
                Register
            </button>
        </div>

        <!-- Login Link -->
        <div class="text-center pt-2">
            <span class="text-sm text-gray-600">Already have an account?</span>
            <a href="/loginPatient" class="ml-1 text-sm font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </a>
        </div>
        <p class="text-red-500 text-center">{registrationMessage}</p>
    </div>
</div>
