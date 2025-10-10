import { NextResponse } from "next/server";
import { UserRepository } from "@/lib";
import { KAKIOKI_CONFIG } from "@/lib/config";

export async function PUT(request: Request) {
  try {
    const { userId, username } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "No user ID provided" },
        { status: 400 }
      );
    }

    const userRepository = new UserRepository();
    const userIdNumber = parseInt(userId, 10);

    if (isNaN(userIdNumber)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const updateData: { username?: string } = {};

    if (username) {
      if (username.length > KAKIOKI_CONFIG.account.maxUsernameLength) {
        return NextResponse.json(
          {
            error: `Username must be at most ${KAKIOKI_CONFIG.account.maxUsernameLength} characters`,
          },
          { status: 400 }
        );
      }
      updateData.username = username;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No data to update" }, { status: 400 });
    }

    const updatedUser = await userRepository.update(userIdNumber, updateData);

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        userId: updatedUser.user_id,
        email: updatedUser.email,
        username: updatedUser.username,
        avatarUrl: updatedUser.avatar_url,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Error updating profile" },
      { status: 500 }
    );
  }
}
