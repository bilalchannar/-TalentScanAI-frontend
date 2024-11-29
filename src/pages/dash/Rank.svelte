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
    .content {
        padding: 20px;
    }


.table-section table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.table-section th,
.table-section td {
  padding: 10px;
  text-align: center;
  border: 1px solid #ccc;
}

.table-section th {
  background-color: #f4f4f4;
}



.content {
  padding: 20px;
}

.job-section {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  padding: 20px;
}

.job-description {
  flex: 1;
  min-width: 300px;
  background: white;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}


.job-description textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  resize: none;
}


.table-section table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.table-section th,
.table-section td {
  padding: 10px;
  text-align: center;
  border: 1px solid #ccc;
}

.table-section th {
  background-color: #f4f4f4;
}

.table-section td button {
  background-color: #4b62f6;
  color: white;
  border: none;
  padding: 5px 10px;
  cursor: pointer;
  border-radius: 5px;
}

@media (max-width: 768px) {
  header {
    flex-direction: column;
    align-items: center;
  }

  nav ul {
    flex-direction: column;
    gap: 10px;
  }

  .table-section table {
    font-size: 14px;
  }

  .table-section th,
  .table-section td {
    padding: 8px;
  }

  .job-section {
    flex-direction: column;
    gap: 10px;
  }

  .job-description {
    min-width: 100%;
  }
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
            <h1>Rank Resumes</h1>
        </header>
        <div class="job-section">
            <div class="job-description">
                <h2>Enter Job Description</h2>
                <textarea placeholder="Copy-paste or type it here..." rows="10" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;"></textarea>
            </div>
        </div>
        <section class="content">
            <div class="table-section">
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Name</th>
                            <th>Skills</th>
                            <th>Ranking</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td>John Doe</td>
                            <td>Java, Python, SQL</td>
                            <td>95</td>
                            <td><button>View Reasoning</button></td>
                        </tr>
                        <tr>
                            <td>2</td>
                            <td>Michael Johnson</td>
                            <td>JavaScript, Node.js, HTML</td>
                            <td>90</td>
                            <td><button>View Reasoning</button></td>
                        </tr>
                        <tr>
                            <td>3</td>
                            <td>Jane Smith</td>
                            <td>HTML, CSS, JavaScript</td>
                            <td>88</td>
                            <td><button>View Reasoning</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </main>
</div>








