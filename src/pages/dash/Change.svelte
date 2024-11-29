<style>
    .dashboard-container {
        display: flex;
        height: 100vh;
        width: 100vw;
    }
    .sidebar {
        width: 250px;
        background-color: #4c3dd3;
        color: white;
        padding: 20px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .sidebar .logo {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 30px;
    }
    .sidebar nav ul {
        list-style: none;
    }
    .sidebar nav ul li {
        margin: 15px 0;
    }
    .sidebar nav ul li a {
        color: white;
        text-decoration: none;
        font-size: 18px;
    }
    .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }
    @media (max-width: 768px) {
        .dashboard-container {
            flex-direction: column;
        }
        .sidebar {
            width: 100%;
            padding: 10px;
        }
        .main-content {
            padding: 10px;
        }
    }
    .logo {
        display: flex;
        align-items: center;
        font-size: 24px;
        font-weight: bold;
    }




    .settings-page {
    padding: 20px;
    margin-bottom: 30px !important;
    width: 900px;
    margin: 0 auto;
    background-color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
}

.settings-content {
    display: flex;
    flex-direction: column;
    gap: 30px;
}

.settings-section {
    background-color: #f9f9f9;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.settings-section h3 {
    margin-bottom: 15px;
    color: #333;
}


.settings-section button {
    background-color: #4b62f6;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
}
.settings-section button:hover {
    background-color: #3a4ec8;
}
.settings-section form {
    display: flex;
    flex-direction: column;
}  
  header .logo img {
    margin-right: 10px;
  }
  form input {
        width: 80%;
        padding: 12px;
        margin: 10px 0;
        font-size: 16px;
        display: block;
        margin-left: auto;
        border-radius: 4px;
        margin-right: auto; 
        border: 1px solid #ddd;
    }
  
</style>

<div class="dashboard-container">
    <aside class="sidebar">
        <div class="logo">
            <img src="imgs/logo.png" alt="Logo" style="height: 25px; width: 45px;">
            TalentScanAI
        </div>
        <nav>
            <ul>
                <li><a href="/#/dash/manage">Manage Resumes</a></li>
                <li><a href="/#/dash/rank">Rank Resumes</a></li>
                <li><a href="/#/dash/support">Support</a></li>
                <li><a href="/#/dash/change">Settings</a></li>
                <li><a href="/#/auth/logout">Logout</a></li>
            </ul>
        </nav>
    </aside>
    <main class="main-content">
        <section class="settings-page">
            <div class="settings-content">
                <div class="settings-section">
                    <h3>Change Password</h3>
                    <form>
                        <input type="password" name="email" placeholder="Old Password" required>
                        <input type="password" name="password" placeholder="New Password" required>
                        <input type="password" name="password" placeholder="Confirm Password" required>
                        <button type="submit">Change Password</button>
                    </form>
                </div>
            </div>
        </section>
    </main>
</div>
