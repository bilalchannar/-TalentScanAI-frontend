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

<style>
    .settings-page {
        padding: 20px;
        margin-bottom: 30px !important;
        width: 900px;
        margin: 0 auto;
        margin-top: 20vh;
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
