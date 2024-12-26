<script>
    import Router from 'svelte-spa-router';

    import Change from "./Change.svelte";
	import Education from "./Education.svelte";
	import Manage from "./Manage.svelte";
	import Rank from "./Rank.svelte";
	import Support from "./Support.svelte";

	const routes = {
        '/dash/change': Change,
		'/dash/education': Education,
		'/dash/manage': Manage,
		'/dash/rank': Rank,
		'/dash/support': Support,
    }
</script>

<div class="container">
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
        <Router {routes} />
    </main>
</div>

<style>
.container {
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
    position: fixed;
    height: 100%;
    top: 0;
    left: 0;
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
}

.sidebar .logo {
    display: flex;
    align-items: center;
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 30px;
}

.sidebar .logo img {
    height: 25px;
    width: 45px;
    margin-right: 10px;
}

.sidebar nav ul {
    list-style: none;
    padding: 0;
}

.sidebar nav ul li {
    margin: 15px 0;
}

.sidebar nav ul li a {
    color: white;
    text-decoration: none;
    font-size: 18px;
    padding: 10px;
    display: block;
    border-radius: 5px;
    transition: background-color 0.2s;
}

.sidebar nav ul li a:hover {
    background-color: #3e2c9c;
}

.main-content {
    margin-left: 250px;
    padding: 20px;
    flex: 1;
}

@media (max-width: 768px) {
    .container {
        flex-direction: column;
    }

    .sidebar {
        width: 100%;
        position: static;
        height: auto;
        box-shadow: none;
    }

    .main-content {
        margin-left: 0;
        padding: 10px;
    }
}
</style>
