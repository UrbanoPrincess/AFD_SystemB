<script lang="ts">
    // @ts-nocheck
    import Swal from 'sweetalert2'; 
    import { Label, Input, Button, Toast } from 'flowbite-svelte';  
    import {
        GoogleSolid,  
        CheckOutline, 
        CloseOutline, 
        ExclamationCircleOutline, 
        InfoCircleOutline  
    } from "flowbite-svelte-icons";
    import {
        getAuth,
        signInWithEmailAndPassword,
        GoogleAuthProvider,  
        signInWithPopup 
    } from 'firebase/auth';
    import { firebaseConfig } from "$lib/firebaseConfig";
    import { initializeApp, getApps, getApp } from "firebase/app";
    import { getFirestore, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";  
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);  

    let email = '';
    let password = '';
    let showPassword = false;
    let rememberMe = false;

    type ToastType = 'info' | 'success' | 'warning' | 'error';
    let toastVisible: boolean = false;
    let toastMessage: string = '';
    let toastType: ToastType = 'info';
    let toastDuration: number = 3000;
    let toastTimeoutId: number | null = null;

    let isLoggingIn = false; 
    let isGoogleLoggingIn = false; 

    function showFlowbiteToast(message: string, type: ToastType = 'info', duration: number = 3000) {
        toastMessage = message;
        toastType = type;
        toastVisible = true;
        toastDuration = duration;
        if (toastTimeoutId !== null) clearTimeout(toastTimeoutId);
        if (duration > 0) {
            toastTimeoutId = window.setTimeout(() => {
                toastVisible = false;
                toastTimeoutId = null;
            }, duration);
        }
    }

    onMount(() => {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('rememberMe') === 'true') {
            email = localStorage.getItem('email') || '';
            password = localStorage.getItem('password') || '';
            rememberMe = true;
        }
    });

    async function processSuccessfulLogin(user: any, providerId: string) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();

            if (userData.role !== 'userPatient') {
                showFlowbiteToast(`Access denied. This login is for patients only. Your role is ${userData.role}.`, "error", 6000);
                await auth.signOut();
                return; 
            }

            await setDoc(userDocRef, {
                lastLoginAt: new Date().toISOString(), 
                ...(providerId === 'google.com' && { 
                    displayName: user.displayName || userData.displayName,
                    photoURL: user.photoURL || userData.photoURL,
                })
            }, { merge: true });

            showFlowbiteToast(`Login Successful! Welcome, ${userData.displayName || user.email}`, "success", 3000);
            // Swal.fire({ icon: 'success', title: 'Login Successful', text: `Welcome, ${userData.displayName || user.email}`, showConfirmButton: false, timer: 2000, customClass: { popup: 'swal-custom' } });

            if (rememberMe && providerId === 'password') { 
                localStorage.setItem('email', email);
                localStorage.setItem('password', password); 
                localStorage.setItem('rememberMe', 'true');
            } else if (providerId === 'password') { 
                localStorage.removeItem('email');
                localStorage.removeItem('password');
                localStorage.removeItem('rememberMe');
            }

            setTimeout(() => {
                goto('/auth/profile'); 
                toastVisible = false; 
            }, 1500);

        } else {
            showFlowbiteToast("Login successful, but patient profile not found. Please complete registration or contact support.", "error", 6000);
            // Swal.fire({ icon: 'error', title: 'Profile Not Found', text: 'Your account exists, but your patient profile is missing. Please complete registration or contact support.', showConfirmButton: true });
            await auth.signOut();
        }
    }

    async function handleEmailPasswordLogin() {
        if (!email.trim() || !password.trim()) {
            showFlowbiteToast("Please enter both email and password.", "warning");
            return;
        }
        isLoggingIn = true;
        showFlowbiteToast("Logging in...", "info", 0); 
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            await processSuccessfulLogin(userCredential.user, 'password');
        } catch (error) {
            console.error('Error during email/password login:', error);
            let errorMessage = 'An error occurred. Please try again.';
            if (error.code) {
                switch (error.code) {
                    case 'auth/invalid-credential':
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        errorMessage = 'Invalid email or password. Please try again.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'The email address is not valid.';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = 'This account has been disabled. Please contact support.';
                        break;
                    case 'auth/too-many-requests':
                         errorMessage = "Access temporarily disabled due to many failed attempts. Try again later or reset your password.";
                         break;
                    default:
                        errorMessage = 'Login failed. Please try again later.';
                }
            }
            showFlowbiteToast(errorMessage, "error", 6000);
        } finally {
            isLoggingIn = false;
            if (toastMessage === "Logging in...") toastVisible = false;
        }
    }

    async function handleGoogleLogin() {
        isGoogleLoggingIn = true;
        showFlowbiteToast("Connecting to Google...", "info", 0);
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            await processSuccessfulLogin(result.user, 'google.com');
        } catch (err: any) {
            console.error("Google Login Error:", err);
            let userFriendlyMessage = "Failed to sign in with Google. Please try again.";
            if (err.code) {
                switch (err.code) {
                    case 'auth/popup-closed-by-user':
                        userFriendlyMessage = "Google Sign-In cancelled.";
                        break;
                    case 'auth/account-exists-with-different-credential':
                        userFriendlyMessage = "An account may already exist with this email using a different sign-in method. Try that method, or if this is your first time with Google, ensure the email matches your registered patient email.";
                        break;
                    case 'auth/popup-blocked':
                        userFriendlyMessage = "Google Sign-In popup was blocked. Please allow popups.";
                        break;
                    default:
                        userFriendlyMessage = "Google Sign-In failed. Please try again later.";
                }
            }
            showFlowbiteToast(userFriendlyMessage, "error", 6000);
        } finally {
            isGoogleLoggingIn = false;
            if (toastMessage === "Connecting to Google...") toastVisible = false;
        }
    }

</script>

<style>
:global(body, html) {
    margin: 0;
    padding: 0;
    height: 100%;
}
@media (max-width: 768px) {
    :global(.swal-custom) { 
        width: 80% !important;
        font-size: 0.9rem !important;
    }
}
@media (max-width: 480px) {
    :global(.swal-custom) {
        width: 90% !important;
        font-size: 0.8rem !important;
    }
}
</style>

{#if toastVisible} 
    <div class="fixed top-5 right-5 z-50">
        <Toast
            color={toastType === 'success' ? 'green' : toastType === 'error' ? 'red' : toastType === 'warning' ? 'yellow' : 'blue'}
            dismissable
            on:close={() => { toastVisible = false; if (toastTimeoutId !== null) clearTimeout(toastTimeoutId); }}
        >
            <svelte:fragment slot="icon">
                {#if toastType === 'success'} <CheckOutline class="h-5 w-5" />
                {:else if toastType === 'error'} <CloseOutline class="h-5 w-5" />
                {:else if toastType === 'warning'} <ExclamationCircleOutline class="h-5 w-5" />
                {:else} <InfoCircleOutline class="h-5 w-5" /> {/if}
            </svelte:fragment>
            {toastMessage}
        </Toast>
    </div>
{/if}

<div class="min-h-screen bg-gradient-to-r from-[#2d3a69] to-[#334eac] flex items-center justify-center px-4 sm:px-8 md:px-16 lg:px-24">
    <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div class="flex items-center mb-6">  
            <img src="/images/lock.png" alt="Lock Icon" class="w-12 h-12 mr-4" />
            <h2 class="text-3xl font-semibold text-gray-800">PATIENT LOGIN</h2>
        </div>

        <form on:submit|preventDefault={handleEmailPasswordLogin}>
            <div class="mb-6">
                <Label for="email-login" class="block mb-2">Email</Label>  
                <Input
                    type="email"
                    id="email-login"
                    placeholder="Enter your email"
                    class="border p-2 w-full"
                    bind:value={email}
                    required
                />
            </div>

            <div class="mb-6">
                <Label for="password-login" class="block mb-2">Password</Label>  
                <div class="relative">
                    <Input
                        type={showPassword ? 'text' : 'password'}
                        id="password-login"
                        placeholder="Enter your password"
                        class="border p-2 w-full"
                        bind:value={password}
                        required
                    />
                    <button
                        type="button"
                        class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 focus:outline-none"
                        on:click={() => showPassword = !showPassword}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {#if showPassword}
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19.5c-5.162 0-9.246-3.697-10.125-8.55a1.286 1.286 0 010-.9c.879-4.853 4.963-8.55 10.125-8.55a10.05 10.05 0 011.875.175M15 12a3 3 0 11-6 0 3 3 0 016 0zm6-6.75L4.5 19.5" />
                        </svg>
                        {:else}
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {/if}
                    </button>
                </div>
            </div>

            <div class=" flex items-center justify-between">
                <div>
                    <input
                        type="checkbox"
                        id="remember-login"
                        class="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        bind:checked={rememberMe}
                    />
                    <label for="remember-login" class="text-sm text-gray-700">Remember me</label>
                </div>
                <!-- Forgot Password Link -->
                <!-- <a href="/forgot-password" class="text-sm font-medium text-blue-600 hover:text-blue-500">
                    Forgot password?
                </a> -->
            </div>

            <div class="mb-6">
                <Button
                    type="submit"
                    class="w-full"
                    disabled={isLoggingIn}
                >
                    {isLoggingIn ? 'Logging in...' : 'Login'}
                </Button>
            </div>
        </form> 
        <div class="my-6 flex items-center">
            <hr class="flex-grow border-gray-300">
            <span class="mx-4 text-gray-500 text-sm">OR</span>
            <hr class="flex-grow border-gray-300">
        </div>

        <div class="mb-6">
            <Button
                on:click={handleGoogleLogin}
                disabled={isGoogleLoggingIn}
                color="light"
                class="w-full flex items-center justify-center"
            >
                <GoogleSolid class="w-5 h-5 mr-2" />
                {isGoogleLoggingIn ? 'Connecting...' : 'Sign in with Google'}
            </Button>
        </div>

        <div class="text-center">
            <p class="text-sm text-gray-600">Don't have an account?</p>
            <a href="/registerPatient" class="ml-1 text-sm font-medium text-blue-600 hover:text-blue-500">
                Register
            </a>
        </div>
    </div>
</div>