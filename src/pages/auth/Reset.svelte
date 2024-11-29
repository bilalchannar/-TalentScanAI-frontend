<style>
    .container {
        width: 100%;
        padding: 20px;
        max-width: 830px;
        border-radius: 10px;
        background-color: white;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    header {
        display: flex;
        align-items: center;
        margin-bottom: 30px;
        justify-content: space-between;
    }
    .logo {
        display: flex;
        align-items: center;
        font-size: 24px;
        font-weight: bold;
        color: #4a4a4a;
    }
    .login-section {
        text-align: center;
    }
    h2 {
        color: #333;
        font-size: 28px;
        font-weight: bold;
        margin-bottom: 10px;
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
    form button {
        width: 30%;
        border: none;
        padding: 14px;
        color: white;
        display: block;
        font-size: 16px;
        cursor: pointer;
        margin-left: auto;
        margin-right: auto;
        border-radius: 4px;
        background-color: #6c63ff;
    }
    form button:hover {
        background-color: #4b47c2;
    }
    .extra-links {
        gap: 5px;
        display: flex;
        padding-top: 10px;
        align-items: center;
        flex-direction: column; 
        padding-bottom: 10px;
    }
    .extra-links a {
        font-size: 14px;
        color: #6c63ff;
        text-decoration: none;
    }
    .extra-links a:hover {
        text-decoration: underline;
    }
</style>

<div class="container">
    <header>
        <div class="logo">
            <img src="imgs/logo.png" alt="Logo" style="height: 25px; width: 45px;">
            TalentScanAI
        </div>
    </header>
    <div class="login-section">
        <h2>Reset Password</h2>
        <form action="#" method="POST">
            <input type="password" placeholder="New password" required>
            <input type="password" placeholder="Confirm password" required>
            <br>
            <button type="button">Reset Password</button>
        </form>
        <div class="extra-links">
            <a href="/#/auth/login">← Go Back to Login</a>
        </div>
    </div>
</div>