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
                    <td>Michael White</td>
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
                <tr>
                    <td>4</td>
                    <td>Bob Johnson</td>
                    <td>Python, Data Science, AI</td>
                    <td>85</td>
                    <td><button>View Reasoning</button></td>
                </tr>
                <tr>
                    <td>5</td>
                    <td>Alice Brown</td>
                    <td>C++, Java, Algorithms</td>
                    <td>80</td>
                    <td><button>View Reasoning</button></td>
            </tbody>
        </table>
    </div>
</section>

<style>
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
        padding: 15px;
        border: 1px solid #ccc;
        border-radius: 5px;
        resize: vertical;
        font-family: 'Arial', sans-serif;
        font-size: 16px;
        color: #333;
        background-color: #f8f8f8;
        box-sizing: border-box;
        transition: all 0.2s ease-in-out;
    }

    .job-description textarea:focus {
        outline: none;
        border-color: #4b62f6;
        box-shadow: 0 0 5px rgba(75, 98, 246, 0.2);
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
