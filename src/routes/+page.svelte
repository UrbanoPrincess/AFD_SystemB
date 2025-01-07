<style>
    /* Make sure the body and html fill the entire viewport and prevent scrolling */
    html, body {
        height: 100%;
        margin: 0;
        overflow: hidden; /* Prevent scrolling */
    }

    header {
        display: flex;
        justify-content: flex-end;
        padding: 20px;
        position: fixed; /* Fixed header */
        top: 0;
        right: 0;
        width: 100%;
        background-color: rgba(17, 28, 95, 0); 
        z-index: 1000; 
    }
    
    nav {
        display: flex;
        gap: 25px; 
    }
    
    nav a {
        text-decoration: none;
        color: #000; 
        font-weight: bold;
        font-size: 1rem;
    }

    main {
        display: flex;
        justify-content: space-between;
        align-items: flex-start; /* Align items to the top */
        height: 100vh; /* Set height to full viewport */
        box-sizing: border-box;
        overflow: hidden; /* Prevent scrolling within main */
        padding: 0 0rem; /* Add horizontal padding if needed */
    }

    .left-section {
        flex: 1; 
        max-width: 50%;
        overflow: hidden; /* Prevent overflow */
    }

    .left-section h1 {
        margin-top: 10rem;
        margin-left: 2rem;
        font-size: 3rem; 
        color: #ffd700; 
        margin-bottom: 15px;
        font-weight: bold;
        line-height: 1.2;
    }

    .right-section {
        flex: 1; 
        display: flex;
        justify-content: flex-start; /* Align items to the left */
        align-items: flex-start; /* Align items to the top */
        overflow: hidden; /* Prevent overflow */
        padding: 0; /* Remove padding */
    }

    .right-section img {
        max-width: 100%; /* Ensure image fits within the section */
        max-height: 80%; 
        object-fit: contain; 
        margin-left: 10rem; /* Adjusted left margin */
        margin-top: -1rem; /* Adjusted top margin */
        animation: fadeInBounce 2s ease-out; /* Add animation */
    }

    /* Keyframes for the fade-in and bounce effect */
    @keyframes fadeInBounce {
        0% {
            opacity: 0;
            transform: scale(0.8) translateY(-50px);
        }
        50% {
            opacity: 1;
            transform: scale(1.05) translateY(10px);
        }
        100% {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
</style>

<header>
    <nav>
        <a href="/loginPatient">Patient Login</a>
    </nav>
</header>

<main>
    <div class="left-section">
        <h1>Dental Patient Records and Prescription Management System for Streamlined Dental Care and Treatment Tracking</h1>
    </div>
    <div class="right-section">
        <img src="/images/logo(landing).png" alt="Landing Logo" height="400" />
    </div>
</main>
