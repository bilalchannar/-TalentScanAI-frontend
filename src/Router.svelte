<script>
	import Router from 'svelte-spa-router';
	import { location, replace } from 'svelte-spa-router';

	import Login from "./pages/auth/Login.svelte";
	import Reset from "./pages/auth/Reset.svelte";
	import Signup from "./pages/auth/Signup.svelte";
	import Forgot from "./pages/auth/Forgot.svelte";
	import Logout from "./pages/auth/Logout.svelte";

	import Rank from "./pages/dash/Rank.svelte";
	import Change from "./pages/dash/Change.svelte";
	import Manage from "./pages/dash/Manage.svelte";
	import Support from "./pages/dash/Support.svelte";
	import Analyse from "./pages/dash/Analyse.svelte";

	const routes = {
		'/auth/login': Login,
		'/auth/reset': Reset,
		'/auth/signup': Signup,
		'/auth/forgot': Forgot,
		'/auth/logout': Logout,

		'/dash/rank': Rank,
		'/dash/change': Change,
		'/dash/manage': Manage,
		'/dash/support': Support,
		'/dash/analyse': Analyse,
	};

	if ($location == '/') replace("/auth/login");
</script>

<Router {routes} />
