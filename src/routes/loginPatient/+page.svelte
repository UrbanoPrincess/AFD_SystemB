<script>
    // @ts-nocheck
    import Swal from 'sweetalert2';
    import { Label, Input } from 'flowbite-svelte';
    import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
    import { firebaseConfig } from "$lib/firebaseConfig";
    import { initializeApp, getApps, getApp } from "firebase/app";
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    // Initialize Firebase app
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);

    let email = '';
    let password = '';
    let showPassword = false; // State for showing password
    let rememberMe = false; // State for remember me checkbox

    // Load saved email and password from local storage on the client side
    onMount(() => {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('rememberMe') === 'true') {
            email = localStorage.getItem('email') || '';
            password = localStorage.getItem('password') || '';
            rememberMe = true;
        }
    });

    async function handleLogin() {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
        Swal.fire({
    icon: 'success',
    title: 'Login Successful',
    text: `Welcome, ${userCredential.user.email}`,
    showConfirmButton: false,
    timer: 2000,
    customClass: {
        popup: 'swal-custom'
    }
    });


        if (rememberMe) {
            localStorage.setItem('email', email);
            localStorage.setItem('password', password);
            localStorage.setItem('rememberMe', 'true');
        } else {
            localStorage.removeItem('email');
            localStorage.removeItem('password');
            localStorage.removeItem('rememberMe');
        }

        setTimeout(() => goto('/auth/profile'), 2000);
    } catch (error) {
        console.error('Error during login:', error); // Log the error for debugging

        // Map Firebase errors to user-friendly messages
        let errorMessage = 'An error occurred. Please try again.';
        if (error.code === 'auth/invalid-credential') {
            errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'The email address is not valid.';
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password. Please try again.';
        }

        Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: errorMessage,
            showConfirmButton: true
        });
    }
}


    function redirectToRegistration() {
        goto('/registerPatient');
    }
</script>

<style>
:global(body, html) {
    margin: 0;
    padding: 0;
    height: 100%;
}

    @media (max-width: 768px) {
    .swal-custom {
        width: 80% !important;
        font-size: 0.9rem !important;
    }
}

@media (max-width: 480px) {
    .swal-custom {
        width: 90% !important; 
        font-size: 0.8rem !important;
    }
}
</style>


<!-- Patient Login Form -->
<div class="min-h-screen bg-gradient-to-r from-[#2d3a69] to-[#334eac] flex items-center justify-center px-4 sm:px-8 md:px-16 lg:px-24">
    <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div class="flex items-center mb-4">
            <img src="/images/lock.png" alt="Lock Icon" class="w-12 h-12 mr-4" />
            <h2 class="text-3xl font-semibold text-gray-800">PATIENT LOGIN</h2>
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
            <div class="relative">
                <Input 
                    type={showPassword ? 'text' : 'password'} 
                    id="password" 
                    placeholder="Enter your password" 
                    class="border p-2 w-full" 
                    bind:value={password} 
                    required 
                />
                <button 
                    type="button" 
                    class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600"
                    on:click={() => showPassword = !showPassword}
                >
                    {#if showPassword}
                        <!-- Eye Slash Icon (Hide) -->
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875  12a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM12 4.5c-4.5 0-8.25 3.375-8.25 7.5s3.75 7.5 8.25 7.5c1.5 0 2.875-.375 4.125-1.125M16.5 16.5l4.5 4.5M3 3l18 18" />
                        </svg>
                    {:else}
                        <!-- Eye Icon (Show) -->
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.5c-4.5 0-8.25 3.375-8.25 7.5s3.75 7.5 8.25 7.5c1.5 0 2.875-.375 4.125-1.125M12 4.5c4.5 0 8.25 3.375 8.25 7.5s-3.75 7.5-8.25 7.5c-1.5 0-2.875-.375-4.125-1.125M16.5 16.5l4.5 4.5M3 3l18 18" />
                        </svg>
                    {/if}
                </button>
            </div>
        </div>

        <!-- Remember me checkbox -->
        <div class="mb-6 flex items-center">
            <input 
                type="checkbox" 
                id="remember" 
                class="mr-2" 
                bind:checked={rememberMe}
            />
            <label for="remember" class="text-gray-600">Remember me</label>
        </div>

        <!-- Login button -->
        <div class="mb-6">
            <button 
                type="submit" 
                class="w-full p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                on:click={handleLogin}
            >
                Login
            </button>
        </div>

        <!-- Registration button -->
        <div class="text-center">
            <p class="text-gray-600 mb-2">Don't have an account?</p>
            <a href="/registerPatient" class="ml-1 text-sm font-medium text-blue-600 hover:text-blue-500">
                Register
            </a>
        </div>
    </div>
</div>

