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
        padding: 20px;
    }
    td {
        text-align: center !important;
    }
    header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
    }
    header h1 {
        font-size: 28px;
        color: #333;
    }
    .stats {
        display: flex;
        gap: 20px;
    }
    .stat-box {
        background-color: #fff;
        padding: 20px;
        border-radius: 5px;
        text-align: center;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    .stat-box h3 {
        font-size: 18px;
        color: #555;
    }
    .stat-box p {
        font-size: 24px;
        font-weight: bold;
        color: #333;
    }
    .resume-table table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
    }
    .resume-table th, .resume-table td {
        padding: 12px;
        text-align: center;
        border: 1px solid #ddd;
    }
    .resume-table th {
        background-color: #f4f4f4;
    }
    td button {
        background-color: #5044c4;
        color: white;
        border: none;
        padding: 8px 16px;
        cursor: pointer;
        border-radius: 5px;
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
        .stats {
            flex-direction: column;
            gap: 10px;
        }
        .resume-table table {
            font-size: 14px;
        }
        .resume-table th, .resume-table td {
            padding: 10px;
        }
    }
    .resume-table table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
    }
    .resume-table th, .resume-table td {
        padding: 12px;
        text-align: left;
        border: 1px solid #ddd;
    }
    .resume-table th {
        background-color: #f4f4f4;
        font-weight: bold;
    }
    td button {
        background-color: #4b62f6;
        color: white;
        border: none;
        padding: 5px 10px;
        cursor: pointer;
        border-radius: 5px;
    }
    @media (max-width: 768px) {
        .resume-table table {
            font-size: 14px;
        }
        .resume-table th, .resume-table td {
            padding: 8px;
        }
        .resume-table td button {
            padding: 4px 8px;
        }
    }
    .logo {
        display: flex;
        align-items: center;
        font-size: 24px;
        font-weight: bold;
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
        <header style="display: flex; align-items: center;">
            <h1>Manage Resumes</h1>
            <div class="stats">
                <button style="width: 100px; border-radius: 10px; border:none; background-color: lightgray;">Upload</button>
                <div class="stat-box">
                    <h3>Total Resumes Uploaded</h3>
                    <p>7</p>
                </div>
            </div>
        </header>
        <section class="content">
            <div class="resume-table">
                <table>
                    <thead>
                        <tr>
                            <th>Candidate Name</th>
                            <th>Resume File</th>
                            <th>Upload Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>John Doe</td>
                            <td>john_doe_resume.pdf</td>
                            <td>2024-11-25</td>
                            <td>
                                <button>Analyse</button>
                                <button style="background-color: red;">Delete</button>
                            </td>
                        </tr>
                        <tr>
                            <td>John Doe</td>
                            <td>john_doe_resume.pdf</td>
                            <td>2024-11-25</td>
                            <td>
                                <button>Analyse</button>
                                <button style="background-color: red;">Delete</button>
                            </td>
                        </tr>
                        <tr>
                            <td>John Doe</td>
                            <td>john_doe_resume.pdf</td>
                            <td>2024-11-25</td>
                            <td>
                                <button>Analyse</button>
                                <button style="background-color: red;">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </main>
</div>
