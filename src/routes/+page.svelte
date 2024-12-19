<script>
    // Optional: Add any global state management or other scripts needed for layout
</script>

<style>
    /* Make sure the body and html fill the entire viewport and prevent scrolling */
    

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
        align-items: center;
        padding: 0 20px; 
        height: 100vh; 
        box-sizing: border-box;
    }

    .left-section {
        flex: 1; 
        max-width: 50%;
    }

    .left-section h1 {
        font-size: 3rem; 
        color: #ffd700; 
        margin-bottom: 15px;
        font-weight: bold;
        line-height: 1.2;
    }

    .right-section {
        flex: 1; 
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .right-section img {
        padding-left: 25rem;
        max-width: 180%; 
        max-height: 80%; 
        object-fit: contain; 
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
    <div class="right-section" style="width: 100%; height: auto;">
  <img src="/images/logo(landing).png" alt="Landing Logo" height="400" />
</div>

</main>


