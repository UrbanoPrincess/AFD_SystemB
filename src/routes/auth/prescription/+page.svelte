<script>
    // Ikaw na bahala dito my idol!
  </script>
  
  <div class="content">
    <header class="content-header">
      <h2>Profile/Patients Info</h2>
    </header>
    <section class="profile-card">
      <div class="profile-header">
        <h3>&lt;Patient_name&gt;</h3>
        <p>Patient ID: xxxxxx</p>
        <p>Age: xx &nbsp; | &nbsp; Gender: xxxxxx</p>
      </div>
      <form class="profile-form">
        <div class="form-group">
          <label for="first-name">First Name</label>
          <input type="text" id="first-name" />
        </div>
        <div class="form-group">
          <label for="last-name">Last Name</label>
          <input type="text" id="last-name" />
        </div>
        <div class="form-group">
          <label for="email">E-Mail Address</label>
          <input type="email" id="email" />
        </div>
        <div class="form-group">
          <label for="home-address">Home Address</label>
          <input type="text" id="home-address" />
        </div>
        <div class="form-group">
          <label for="age">Age</label>
          <input type="number" id="age" />
        </div>
        <div class="form-group">
          <label for="gender">Gender</label>
          <select id="gender">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div class="form-group">
          <label for="old-password">Change Password</label>
          <input type="password" id="old-password" placeholder="Old Password" />
          <input type="password" id="new-password" placeholder="New Password" />
        </div>
        <div class="form-group">
          <label for="phone-number">Phone Number</label>
          <input type="text" id="phone-number" placeholder="e.g. 09123456789" />
        </div>
        <button type="submit" class="save-btn">Save</button>
      </form>
    </section>
  </div>
  
  <style>
    /* Content Styles */
    .content {
      flex-grow: 1;
      padding: 20px;
      margin-top: 10px;
      width: 100%;
    }
  
    .content-header h2 {
      font-size: 1.5rem;
      margin-bottom: 20px;
    }
  
    .profile-card {
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 2px 5px rgba(34, 34, 34, 0.664);
      width: 100%; /* Ensure the card takes full width of its container */
      max-width: 900px; /* Set a max width to prevent it from becoming too wide */
      margin: 0 auto; /* Center the card horizontally */

    }
  
    .profile-header {
      text-align: center;
      background-color: #00a2e8;
      color: white;
      padding: 10px;
      border-radius: 10px;
      margin: -20px -20px 20px;
      width: 104.6%; /* Make sure the header spans the full width of the card */
      background-image: url("/images/logo(landing).png");
      background-position: left center;
      background-size: 240px 180px;
      background-repeat: no-repeat;
      box-shadow: 0 2px 5px rgba(34, 34, 34, 0.664);
    }
  
    .profile-header h3 {
      margin: 0;
    }
  
    .profile-form {
      display: grid;
      grid-template-columns: 400px 450px; /* Adjusted to single column */
      gap: 15px;
      width: 100%;
    }
  
    .form-group {
      display: flex;
      flex-direction: column;
    }
  
    .form-group label {
      margin-bottom: 5px;
      font-size: 0.9rem;
    }
  
    .form-group input,
    .form-group select {
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 5px;
      font-size: 1rem;
      margin-top: 1px;
    }
  
    .save-btn {
      grid-column: span 2;
      padding: 8px 16px; /* Reduced padding */
      background-color: #007bb5;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.9rem; /* Smaller font size */
      transition: background-color 0.3s ease;
    }
  
    .save-btn:hover {
      background-color: #005f8a;
    }
  </style>
  