const fs = require('fs').promises;
const path = require('path');
const filePath = path.join(__dirname, '../data/users.json');

async function loadUsers () {
   try {
        await fs.access(filePath);
        const data = await fs.readFile(filePath, 'utf-8');
        if(!data.trim()) return [];
        return JSON.parse(data);
   } catch (error) {
    return [];
   }
}

async function saveUsers(users) {
    try {
        await fs.writeFile(filePath, JSON.stringify(users, null,4));
    } catch (error) {
        console.error("Failed to save users: ", error.message);
    }
}

async function register(username, password, confirmPass) {
    if (password !== confirmPass) {
        return {
            success : false,
            message : "Password do not match"
        };
    }
    try {
        const users = await loadUsers();
        if (users.some(u => u.username === username)) {
        return {
            success : false,
            message : "❌Username already exists"
        };
    }
     const newUser = {
            username,
            password,
            confirmPass,
            address: `${Math.random().toString(16).substr(2,10)}`,
            balance: {
                BTC: 0,
                ETH: 0,
                SOL: 0,
                USDT: 0,
                TRX: 0,
            }
        };
        users.push(newUser);
        saveUsers(users);
        return {
            success : true, 
            message: "✅Registered succesfully",
            user : newUser
        }
    } catch (error) {
        console.error("Register failed please try again", error.message);
    }
}

async function login(username, password) {
   try {
        const users = await loadUsers();
        const user = users.find(u=>u.username === username && u.password === password);
        if(user) {
            return {
                success:true,
                message : "✅ Login successful",
                user
            };
        }
    return {
        success:false, message : "Invalid credentials"
    };
   } catch (error) {
        console.error("Failed login please try again", error.message);
   }
}

module.exports = {
    loadUsers,
    saveUsers,
    register,
    login
};