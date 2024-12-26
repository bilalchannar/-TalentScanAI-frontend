<header style="display: flex; align-items: center;">
    <h1>Manage Resumes</h1>
    <div class="stats">
        <button style="width: 100px; border-radius: 10px; border:none; background-color: lightgray;">Upload</button>
        <div class="stat-box">
            <h3>Total Resumes Uploaded</h3>
            <p>5</p>
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
                        <button onclick="window.location.href='#/dash/Education'">Analyse</button>
                        <button style="background-color: red;">Delete</button>
                    </td>
                </tr>
                <tr>
                    <td>Jane Smith</td>
                    <td>jane_smith_resume.pdf</td>
                    <td>2024-11-26</td>
                    <td>
                        <button onclick="window.location.href='#/dash/Education'">Analyse</button>
                        <button style="background-color: red;">Delete</button>
                    </td>
                </tr>
                <tr>
                    <td>Bob Johnson</td>
                    <td>bob_johnson_resume.pdf</td>
                    <td>2024-11-27</td>
                    <td>
                        <button onclick="window.location.href='#/dash/Education'">Analyse</button>
                        <button style="background-color: red;">Delete</button>
                    </td>
                </tr>
                <tr>
                    <td>Alice Brown</td>
                    <td>alice_brown_resume.pdf</td>
                    <td>2024-11-28</td>
                    <td>
                        <button onclick="window.location.href='#/dash/Education'">Analyse</button>
                        <button style="background-color: red;">Delete</button>
                    </td>
                </tr>
                <tr>
                    <td>Michael White</td>
                    <td>michael_white_resume.pdf</td>
                    <td>2024-11-29</td>
                    <td>
                        <button onclick="window.location.href='#/dash/Education'">Analyse</button>
                        <button style="background-color: red;">Delete</button>
                    </td>
                </tr>
            </tbody>
            
        </table>
    </div>
</section>

<style>
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

    .resume-table th,
    .resume-table td {
        padding: 12px;
        text-align: center;
        border: 1px solid #ddd;
    }

    .resume-table th {
        background-color: #f4f4f4;
        font-weight: bold;
    }

    .resume-table td button {
        background-color: #4b62f6;
        color: white;
        border: none;
        padding: 8px 16px;
        cursor: pointer;
        border-radius: 5px;
    }

    @media (max-width: 768px) {
        .stats {
            flex-direction: column;
            gap: 10px;
        }

        .resume-table table {
            font-size: 14px;
        }

        .resume-table th,
        .resume-table td {
            padding: 10px;
        }

        .resume-table td button {
            padding: 4px 8px;
        }
    }
</style>