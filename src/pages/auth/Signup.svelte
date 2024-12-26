<script>
    import { replace } from 'svelte-spa-router';
    
    let name = '';
    let email = '';
    let password = '';
    let confirmPassword = '';

    async function signup(event) {
        event.preventDefault();
        
        // Validate passwords match
        if (password !== confirmPassword) {
            alert("Passwords don't match!");
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            const { data, message } = await response.json();
            
            if(response.status === 201) {
                alert('User registered successfully');
                replace('/auth/login');
            } else {
                alert(message);
            }
        } catch (error) {
            console.error('Signup error:', error);
            alert('An error occurred during signup');
        }
    }
</script>

<h2>Join the Future of Recruitment</h2>
<p>Sign Up and Unlock Smarter Hiring</p>
<div class="main-content">
    <section class="signup-section">
        <form on:submit={signup}>
            <input 
                type="text" 
                bind:value={name}
                placeholder="Full Name" 
                required
            >
            <input 
                type="email" 
                bind:value={email}
                placeholder="Email" 
                required
            >
            <input 
                type="password" 
                bind:value={password}
                placeholder="Password" 
                required
            >
            <input 
                type="password" 
                bind:value={confirmPassword}
                placeholder="Confirm Password" 
                required
            >
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

<style>
    .main-content {
        display: flex;
        justify-content: space-between;
        padding: 40px;
    }
    .signup-section {
        flex: 1;
        padding-left: 20px;
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
        margin-left: 50px;
        flex: 1;
    }
    .image-section img {
        width: 100%;
        height: auto;
        object-fit: cover;
    }
</style>
