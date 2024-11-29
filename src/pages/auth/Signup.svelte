<style>
    .container {
        width: 100%;
        max-width: 1200px;
        background: white;
        border-radius: 10px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;
    }
    .main-content {
        display: flex;
        justify-content: space-between;
        padding: 40px;
    }
    .signup-section {
        flex: 1;
        padding-left: 20px;
    }
    .signup-section h2 {
        font-size: 24px;
        margin-bottom: 15px;
        color: #333;
    }
    .signup-section p {
        margin-bottom: 20px;
        color: #777;
    }
    .signup-section form {
        width: 100%;
        max-width: 400px;
    }
    .signup-section form input,
    .signup-section form button {
        width: 100%;
        padding: 10px;
        margin: 10px 0;
        border: 1px solid #ddd;
        border-radius: 4px;
    }
    .signup-section form button {
        background-color: #6c63ff;
        color: white;
        border: none;
        cursor: pointer;
    }
    .signup-section form button:hover {
        background-color: #4b47c2;
    }
    .signup-section .extra-links {
        margin-top: 10px;
    }
    .signup-section .extra-links a {
        color: #6c63ff;
        text-decoration: none;
    }
    .image-section {
        flex: 1;
    }
    .image-section img {
        width: 100%;
        height: auto;
        object-fit: cover;
    }
    header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
    }
    .logo {
        display: flex;
        align-items: center;
        font-size: 24px;
        font-weight: bold;
        color: #4a4a4a;
    }
</style>

<div class="container">
    <header>
        <div class="logo">
            <img src="imgs/logo.png" alt="Logo" style="height: 35px; width: 45px; margin-left: 10px;">
            TalentScanAI
        </div>
    </header>
    <div class="main-content">
        <section class="signup-section">
            <h2>Join the Future of Recruitment</h2>
            <p>Sign Up and Unlock Smarter Hiring</p>
            <form>
                <input type="text" placeholder="Full Name" required>
                <input type="email" placeholder="Email" required>
                <input type="password" placeholder="Password" required>
                <input type="password" placeholder="Confirm Password" required>
                <button type="submit">Sign Up</button>
            </form>
            <div class="extra-links">
                <p>Already have an account? <a href="/#/auth/login">Log in</a></p>
            </div>
        </section>
        <aside class="image-section">
            <img src="imgs/front.png" alt="Teamwork Illustration">
        </aside>
    </div>
</div>