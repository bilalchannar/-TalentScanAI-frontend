<script>
    import './SharedAuthStyles.css';
    import { replace } from 'svelte-spa-router';
    let email = '';
    let password = '';

    async function login() {
        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const { data, message } = await response.json();
            
            
            
            // Navigate to dashboard
            if(response.status === 200) {
                localStorage.setItem('token', data.token);
                console.log('Login successful');
                replace('/dash/manage');
            }else {
                alert(message);
            }
        } catch (error) {
            console.error('Login error:', error);
        }
    }
</script>

<h2>Welcome Back!</h2>
<p>Ready to Find the Perfect Candidate?</p>

<form on:submit|preventDefault={login}>
    <input 
        type="email" 
        bind:value={email} 
        name="email" 
        placeholder="Email address" 
        required 
    />
    <input 
        type="password" 
        bind:value={password} 
        name="password" 
        placeholder="Password" 
        required 
    />
    <br>
    <button type="submit">Login</button>
</form>

<div class="extra-links">
    <p style="margin-bottom: 10px;">Don't have an account? <a href="/#/auth/signup">Sign Up</a></p>
    <a href="/#/auth/forgot">Forgot Password?</a>
</div>
