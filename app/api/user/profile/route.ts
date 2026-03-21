import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { fullName, title, bio, image } = await req.json();

        await connectDB();

        const updateData: any = {};
        if (fullName) updateData.name = fullName;
        if (image !== undefined) updateData.image = image;

        // Save to User model
        const user = await User.findByIdAndUpdate(
            (session.user as any).id,
            { $set: updateData },
            { new: true }
        );

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, user: { name: user.name, image: user.image } });
    } catch (error: any) {
        console.error("Profile update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
