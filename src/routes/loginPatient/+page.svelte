<script lang="ts">
    // @ts-nocheck
    import Swal from 'sweetalert2'; 
    import { Label, Input, Button as FlowbiteButton, Toast } from 'flowbite-svelte'; 
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

    type ToastTypeFB = 'info' | 'success' | 'warning' | 'error'; 
    let toastVisibleFB: boolean = false;
    let toastMessageFB: string = '';
    let toastTypeFB: ToastTypeFB = 'info';
    let toastDurationFB: number = 3000;
    let toastTimeoutIdFB: number | null = null;

    let isLoggingIn = false;
    let isGoogleLoggingIn = false;

    function showAppToast(message: string, type: ToastTypeFB = 'info', duration: number = 3000) {
        toastMessageFB = message;
        toastTypeFB = type;
        toastVisibleFB = true;
        toastDurationFB = duration;
        if (toastTimeoutIdFB !== null) clearTimeout(toastTimeoutIdFB);
        if (duration > 0) {
            toastTimeoutIdFB = window.setTimeout(() => {
                toastVisibleFB = false;
                toastTimeoutIdFB = null;
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
                
                Swal.fire({
                    icon: 'error',
                    title: 'Access Denied',
                    text: `This login is for patients only. Your role is ${userData.role}.`,
                    showConfirmButton: true
                });
                await auth.signOut();
                return false;
            }

            await setDoc(userDocRef, {
                lastLoginAt: new Date().toISOString(),
                ...(providerId === 'google.com' && {
                    displayName: user.displayName || userData.displayName,
                    photoURL: user.photoURL || userData.photoURL,
                })
            }, { merge: true });

            Swal.fire({
                icon: 'success',
                title: 'Login Successful',
                text: `Welcome, ${userData.displayName || user.email}`,
                showConfirmButton: false,
                timer: 2000,
                customClass: { popup: 'swal-custom' }
            });

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
            }, 2000); 
            return true;

        } else {
            Swal.fire({
                icon: 'error',
                title: 'Profile Not Found',
                text: 'Your account exists, but your patient profile is missing. Please complete registration or contact support.',
                showConfirmButton: true
            });
            await auth.signOut();
            return false; 
        }
    }

    async function handleLogin() { 
        if (!email.trim() || !password.trim()) {
            Swal.fire({ icon: 'warning', title: 'Input Required', text: 'Please enter both email and password.', showConfirmButton: true });
            return;
        }
        isLoggingIn = true;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            await processSuccessfulLogin(userCredential.user, 'password');
        } catch (error) {
            console.error('Error during login:', error);
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
                        errorMessage = 'This account has been disabled.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = "Access temporarily disabled due to many failed login attempts.";
                        break;
                    default: 
                        errorMessage = 'An error occurred. Please try again.';
                }
            }
            Swal.fire({
                icon: 'error',
                title: 'Login Failed',
                text: errorMessage,
                showConfirmButton: true
            });
        } finally {
            isLoggingIn = false;
        }
    }

    async function handleGoogleLogin() {
        isGoogleLoggingIn = true;
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const success = await processSuccessfulLogin(result.user, 'google.com');
            if (!success) {
              
            }
        } catch (err: any) {
            console.error("Google Login Error:", err);
            let userFriendlyMessage = "Failed to sign in with Google. Please try again.";
            if (err.code) {
                switch (err.code) {
                    case 'auth/popup-closed-by-user':
                        userFriendlyMessage = "Google Sign-In cancelled.";
                        break;
                    case 'auth/account-exists-with-different-credential':
                        userFriendlyMessage = "An account may already exist with this email using a different sign-in method.";
                        break;
                    case 'auth/popup-blocked':
                        userFriendlyMessage = "Google Sign-In popup was blocked. Please allow popups.";
                        break;
                    default:
                        userFriendlyMessage = "Google Sign-In failed. Please try again later.";
                }
            }
            Swal.fire({ icon: 'error', title: 'Google Sign-In Failed', text: userFriendlyMessage, showConfirmButton: true });
        } finally {
            isGoogleLoggingIn = false;
           
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

{#if toastVisibleFB} 
    <div class="fixed top-5 right-5 z-50">
        <Toast
            color={toastTypeFB === 'success' ? 'green' : toastTypeFB === 'error' ? 'red' : toastTypeFB === 'warning' ? 'yellow' : 'blue'}
            dismissable
            on:close={() => { toastVisibleFB = false; if (toastTimeoutIdFB !== null) clearTimeout(toastTimeoutIdFB); }}
        >
            <svelte:fragment slot="icon">
                {#if toastTypeFB === 'success'} <CheckOutline class="h-5 w-5" />
                {:else if toastTypeFB === 'error'} <CloseOutline class="h-5 w-5" />
                {:else if toastTypeFB === 'warning'} <ExclamationCircleOutline class="h-5 w-5" />
                {:else} <InfoCircleOutline class="h-5 w-5" /> {/if}
            </svelte:fragment>
            {toastMessageFB}
        </Toast>
    </div>
{/if}

<div class="min-h-screen bg-gradient-to-r from-[#094361] to-[#128AC7] flex items-center justify-center px-4 sm:px-8 md:px-16 lg:px-24">
    <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md"> 
        <div class="flex items-center mb-4">
            <img src="/images/lock.png" alt="Lock Icon" class="w-12 h-12 mr-4" />
            <h2 class="text-3xl font-semibold text-gray-800">PATIENT LOGIN</h2>
        </div>

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

        <div class="mb-6 flex items-center">
            <input
                type="checkbox"
                id="remember"
                class="mr-2"
                bind:checked={rememberMe}
            />
            <label for="remember" class="text-gray-600">Remember me</label>
        </div>

        <div class="mb-6">
            <button
                type="button" 
                class="w-full p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                on:click={handleLogin}
                disabled={isLoggingIn}
            >
                {isLoggingIn ? 'Logging in...' : 'Login'}
            </button>
        </div>

        <div class="my-6 flex items-center">
            <hr class="flex-grow border-gray-300">
            <span class="mx-4 text-gray-500 text-sm">OR</span>
            <hr class="flex-grow border-gray-300">
        </div>

        <div class="mb-6">
            <FlowbiteButton
                on:click={handleGoogleLogin}
                disabled={isGoogleLoggingIn}
                color="light" 
                class="w-full flex items-center justify-center"
            >
                <GoogleSolid class="w-5 h-5 mr-2" />
                {isGoogleLoggingIn ? 'Connecting...' : 'Sign in with Google'}
            </FlowbiteButton>
        </div>

        <div class="text-center">
            <p class="text-gray-600 mb-2">Don't have an account?</p>
            <a href="/registerPatient" class="ml-1 text-sm font-medium text-blue-600 hover:text-blue-500">
                Register
            </a>
        </div>
    </div>
</div>