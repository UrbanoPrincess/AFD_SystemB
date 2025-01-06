<script lang="ts">
    // Import necessary modules
    import { writable } from 'svelte/store';
    import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
    import type { User } from "firebase/auth"; // Import User as a type
    import { onMount } from 'svelte'; // Import onMount from Svelte
    import { firebaseConfig } from "$lib/firebaseConfig";
    import { initializeApp, getApps, getApp } from "firebase/app";
    import { goto } from '$app/navigation';
    import '@fortawesome/fontawesome-free/css/all.css';


    // Firebase setup
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);

    // Create a writable store for username
    export const username = writable<string>('');  // The username will be updated here

    export let isCollapsed = false;
    let loading = writable(false);  // State for the loading popup

    // Monitor auth state changes
    onMount(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                username.set(user.displayName ?? user.email ?? '');  // Fallback to empty string if null
            } else {
                username.set(''); // Clear username when logged out
            }
        });

        return () => unsubscribe();
    });

    // Logout function with loading state
    export function logout() {
        loading.set(true);  // Show loading popup

        signOut(auth)
            .then(() => {
                console.log('User signed out');
                username.set(''); // Clear username on logout
                goto('/'); // Navigate to the landing page (routes/+page.svelte)
                loading.set(false);  // Hide loading popup
            })
            .catch((error) => {
                console.error('Error signing out: ', error);
                loading.set(false);  // Hide loading popup on error
            });
    }

    // Function to toggle the sidebar state
    function toggleSidebar() {
        isCollapsed = !isCollapsed;
    }
</script>

<style>
    .layout {
        display: flex;
        height: 100vh;
        overflow: hidden;
    }

    /* Sidebar styles */
    .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        background-color: #00a2e8;
        color: white;
        width: 11.6rem;
        height: 100vh;
        display: flex;
        flex-direction: column;
        transition: width 0.3s ease;
        z-index: 1000;
        box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
    }

    .sidebar.collapsed {
        width: 4.22rem;
    }

    .sidebar-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
    }

    .sidebar-header .circle-background {
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: white;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        padding: 10px;
        transition: width 0.3s ease, height 0.3s ease;
    }

    .sidebar.collapsed .circle-background {
        width: 50px;
        height: 50px;
    }

    .sidebar-header span {
        margin-top: 10px;
        font-size: 1rem;
        white-space: nowrap;
        text-align: center;
    }

    /* Sidebar Menu */
    .sidebar-menu {
        list-style: none;
        padding-top: 3rem;
        margin: 0;
        flex-grow: 1;
    }

    .sidebar-menu li {
        display: flex;
        align-items: center;
        padding: 10px 20px;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .sidebar-menu li:hover {
        background-color: #007bb5;
        color: white;
        
    }

    .sidebar-menu a {
        display: flex;
        align-items: center;
        text-decoration: none;
        color: white;
        width: 100%;
    }

    .sidebar-menu a .icon {
        width: 24px;
        height: 24px;
        margin-right: 10px;
    }

    .sidebar-menu a .text {
        font-size: 1rem;
        white-space: nowrap;
    }

    /* Collapsed Sidebar Adjustments */
    .sidebar.collapsed .text {
        display: none;
    }

    .sidebar.collapsed .icon {
        margin-right: 0;
    }

    /* Logout Button */
    .logout-btn {
        background-color: #00a2e8;
        color: white;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        padding: 10px 20px;
        margin: 20px auto;
        border-radius: 25px;
        width: 90%;
        text-align: center;
        transition: background-color 0.3s ease, padding 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .logout-btn:hover {
        background-color: #007bb5;
    }

    .logout-btn img.logout-icon {
        width: 20px;
        height: 20px;
    }

    .sidebar.collapsed .logout-btn {
        width: auto;
        padding: 10px;
        justify-content: center;
    }

    /* Toggle Sidebar Button */
    .toggle-btn {
        cursor: pointer;
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        padding: 10px;
        text-align: center;
    }

    /* Content area */
    .content.shifted {
        margin-left: 14rem;
    }

    .content.shifted.collapsed {
        margin-left: 5rem;
    }

    /* Loading Popup styles */
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }

    .loading-spinner {
        border: 8px solid #f3f3f3;
        border-top: 8px solid #00a2e8;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 2s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>

<div class="layout">
    <div class="sidebar {isCollapsed ? 'collapsed' : ''}">
        <div class="sidebar-header">
            <div class="circle-background">
                <img src={isCollapsed ? "/images/icon-person.png" : "/images/logo(landing).png"} alt="Logo" />
            </div>
            {#if !isCollapsed}
                <span>{$username}</span> <!-- Display username from store -->
            {/if}
        </div>

        <!-- Sidebar Menu -->
        <ul class="sidebar-menu">
            <li>
                <a href="./profile">
                    <img class="icon" src="/images/profile1.png" alt="Patient Icon" />
                    <span class="text">Profile</span>
                </a>
            </li>
            <li>
                <a href="./appointment">
                    <img class="icon" src="/images/book.png" alt="Dashboard Icon" />
                    <span class="text">Appointment</span>
                </a>
            </li>
            <li>
                <a href="./prescription">
                    <img class="icon" src="/images/history.png" alt="Medicines Icon" />
                    <span class="text">History</span>
                </a>
            </li>
            <li>
                <a href="./medicine-list">
                    <img class="icon" src="/images/medicinelist.png" alt="Prescriptions Icon" />
                    <span class="text">Medicines List</span>
                </a>
            </li>
           
        </ul>

        <!-- Logout Button -->
        <button class="logout-btn" on:click={logout}>
            {#if isCollapsed}
                <img src="/images/logout-icon.png" alt="Logout Icon" class="logout-icon collapsed" />
            {:else}
                Logout
            {/if}
        </button>

        <!-- Toggle Sidebar Button -->
        <button class="toggle-btn" on:click={toggleSidebar}>
            {isCollapsed ? '➡️' : '⬅️'}
        </button>
    </div>

    <!-- Content Area -->
    <div class="content {isCollapsed ? 'shifted collapsed' : 'shifted'}">
        <slot /> <!-- Slot for the main content -->
    </div>

    <!-- Loading Spinner (pop-up) -->
    {#if $loading}
        <div class="loading-overlay">
            <div class="loading-spinner"></div>
        </div>
    {/if}
</div>
