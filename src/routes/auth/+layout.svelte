<script lang="ts">
    export let isCollapsed = false;
    export let logout;

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
        width: 80px; /* Default width */
        height: 80px; /* Default height */
        border-radius: 50%;
        padding: 10px;
        transition: width 0.3s ease, height 0.3s ease; /* Smooth transition */
    }

    .sidebar.collapsed .circle-background {
        width: 50px; /* Smaller width when collapsed */
        height: 50px; /* Smaller height when collapsed */
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
        display: flex; /* Flexbox for aligning icon and text horizontally */
        align-items: center; /* Center vertically */
        text-decoration: none;
        color: white;
        width: 100%;
    }

    .sidebar-menu a .icon {
        width: 24px; /* Adjust icon size */
        height: 24px;
        margin-right: 10px; /* Spacing between icon and text */
    }

    .sidebar-menu a .text {
        font-size: 1rem;
        white-space: nowrap;
    }

    /* Collapsed Sidebar Adjustments */
    .sidebar.collapsed .text {
        display: none; /* Hide text when collapsed */
    }

    .sidebar.collapsed .icon {
        margin-right: 0;
    }

    /* Logout Button */
    .logout-btn {
        background-color: #00b3ff;
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
</style>

<div class="layout">
    <div class="sidebar {isCollapsed ? 'collapsed' : ''}">
        <div class="sidebar-header">
            <div class="circle-background">
                <img src={isCollapsed ? "/images/icon-person.png" : "/images/logo(landing).png"} alt="Logo" />
            </div>
            {#if !isCollapsed}
                <span>&lt;user_name&gt;</span>
            {/if}
        </div>

        <!-- Sidebar Menu -->
        <ul class="sidebar-menu">
            <li>
                <a href="./profile">
                    <i class="fas fa-user icon"></i>
                    <span class="text">Profile</span>
                </a>
            </li>
           
            <li>
                <a href="./medicine-list">
                    <i class="fas fa-pills icon"></i>
                    <span class="text">Medicines List</span>
                </a>
            </li>

            <li>
                <a href="./prescription">
                    <i class="fas fa-file-medical-alt icon"></i>
                    <span class="text">Prescriptions</span>
                </a>
            </li>
            <li>
                <a href="./appointment">
                    <i class="fas fa-calendar-check icon"></i>
                    <span class="text">appointment</span>
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
</div>
