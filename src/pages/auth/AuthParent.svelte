<script>
    import Router from 'svelte-spa-router';

    import Forgot from "./Forgot.svelte";
	import Login from "./Login.svelte";
	import Logout from "./Logout.svelte";
	import Reset from "./Reset.svelte";
	import Signup from "./Signup.svelte";

	const routes = {
		'/auth/forgot': Forgot,
		'/auth/login': Login,
		'/auth/logout': Logout,
		'/auth/reset': Reset,
		'/auth/signup': Signup,
    }
</script>

<div class="container">
    <header>
        <div class="logo">
            <img src="imgs/logo.png" alt="Logo" style="height: 25px; width: 45px;">
            TalentScanAI
        </div>
    </header>
    <div class="login-section">
        <Router {routes} />
    </div>
</div>

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
</style>