// File: server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Complaint = require("./models/Complaint");


const app = express();
app.use(
    cors({
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);
//app.options("*", cors());


app.use(express.json());

// ✅ MongoDB Connection
const mongoURI =
    "mongodb+srv://PriaccClient:Priacc123@priacc.ndcp8z1.mongodb.net/Priacc?retryWrites=true&w=majority";
mongoose
    .connect(mongoURI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";


app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const user = await User.findOne({ email })

        if (user)
            return res.json({ success: false, message: 'Email already exists!' })

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            password: hashedPassword
        })

        const response_result = await newUser.save();
        console.log(response_result)
        return res.json({ success: true, message: "Registered Succesfully", data: response_result })

    }
    catch (err) {

    }
})


// ✅ LOGIN ROUTE
// ✅ Login Route
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // ✅ Include `name` properly in JWT
        const token = jwt.sign(
            {
                id: user._id.toString(),
            },
            process.env.JWT_SECRET || "secretkey",
            { expiresIn: "2h" }
        );

        return res.json({
            message: "Login successful",
            token,
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error" });
    }
});



// ✅ PROFILE SAVE OR UPDATE (using same User table)
// ✅ Save or Update Profile — in the same "User" collection
app.post("/api/profile", async (req, res) => {
    try {
        const userDetails = req.body;

        if (!userDetails) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        // Check if user exists in users collection
        const user = await User.findById(userDetails._id)
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userDetails._id,
            { $set: userDetails },
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser,
        });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ success: false, message: "Server error updating profile" });
    }
});

// ✅ Get Profile by Email (from User collection)
app.get("/api/profile", async (req, res) => {
    try {
        const email = req.query.email;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "Profile not found" });
        }

        res.json({ success: true, user });
    } catch (err) {
        console.error("Fetch profile error:", err);
        res.status(500).json({ success: false, message: "Server error fetching profile" });
    }
});

app.post("/api/user-details", async (req, res) => {
    const id = req.body.id;

    const userDetails = await User.findById(id);
    return res.json({ userDetails });
})

// Create a New Complaint
app.post("/api/create-complaint", async (req, res) => {
    try {
        const data = req.body;
        const user = await User.findOne({ email: data.email });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const complaint = new Complaint({
            user: user._id,
            groupName: data.groupName,
            parentName: data.parentName,
            sectionName: data.sectionName,
            category: data.category,
            issue: data.issue,
            status: "Pending",
            date: new Date()
        });

        await complaint.save();
        res.json({ success: true, complaint });
    } catch (err) {
        console.error("Create complaint error:", err);
        res.status(500).json({ success: false, message: "Error creating complaint" });
    }
});

// ✅ Fetch user complaints by email
app.post("/api/user-complaints", async (req, res) => {
    try {
        const { email } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Fetch complaints related to user
        const complaints = await Complaint.find({ user: user._id }).sort({ date: -1 });

        return res.json({ success: true, complaints });
    } catch (err) {
        console.error("Error fetching complaints:", err);
        res.status(500).json({ success: false, message: "Error fetching complaints" });
    }
});
// ✅ Toggle complaint bookmark
app.post("/api/toggle-bookmark", async (req, res) => {
    try {
        const { complaintId, bookmarked } = req.body;
        const updated = await Complaint.findByIdAndUpdate(
            complaintId,
            { bookmarked },
            { new: true }
        );
        res.json({ success: true, complaint: updated });
    } catch (err) {
        console.error("Error toggling bookmark:", err);
        res.status(500).json({ success: false, message: "Error updating bookmark" });
    }
});

app.delete("/api/delete-complaint/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Complaint.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ success: false, message: "Complaint not found" });
        res.json({ success: true, message: "Complaint deleted successfully" });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ success: false, message: "Server error deleting complaint" });
    }
});

// ✅ Get all complaints (for admin)
app.get("/api/all-complaints", async (req, res) => {
    try {
        const complaints = await Complaint.find().populate("user", "email name");
        const formatted = complaints.map((c) => ({
            ...c._doc,
            userEmail: c.user?.email || "Unknown",
        }));
        res.json({ success: true, complaints: formatted });
    } catch (err) {
        console.error("Error fetching all complaints:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ✅ Get all workers (assuming role field)
app.get("/api/workers", async (req, res) => {
    try {
        const workers = await User.find({ role: "worker" }).select("_id name email");
        res.json({ success: true, workers });
    } catch (err) {
        console.error("Error fetching workers:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ✅ Assign complaint to worker
app.put("/api/assign-complaint/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { workerId } = req.body;
        const complaint = await Complaint.findByIdAndUpdate(
            id,
            { assignedTo: workerId, status: "In Progress" },
            { new: true }
        );
        res.json({ success: true, complaint });
    } catch (err) {
        console.error("Assign complaint error:", err);
        res.status(500).json({ success: false, message: "Error assigning complaint" });
    }
});

// ✅ Reslove complaint
app.put("/api/resolve-complaint/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const complaint = await Complaint.findByIdAndUpdate(
            id,
            { status: "Resolved" },
            { new: true }
        );
        if (!complaint)
            return res.status(404).json({ success: false, message: "Complaint not found" });

        res.json({ success: true, message: "Complaint resolved", complaint });
    } catch (err) {
        console.error("Resolve complaint error:", err);
        res.status(500).json({ success: false, message: "Error resolving complaint" });
    }
});



// ✅ START SERVER
const PORT = 3001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
