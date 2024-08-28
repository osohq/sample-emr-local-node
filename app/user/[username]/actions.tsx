"use server";

import { pool } from "@/lib/db";
import { User } from "@/lib/relations";
import { Result, handleError } from "@/lib/result";

// Create a new user
export async function createUser(
  _prevState: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const data = {
    username: formData.get("username"),
    org: formData.get("organization"),
    role: formData.get("role"),
  };

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO users (username, org, role) VALUES ($1, $2, $3::organization_role);`,
      [data.username, data.org, data.role],
    );
    return { success: true, value: null };
  } catch (error) {
    return handleError(error);
  } finally {
    client.release();
  }
}

// Create a new organization
export async function createOrg(
  _prevState: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const data = {
    name: formData.get("orgName"),
  };

  const client = await pool.connect();
  try {
    await client.query(`INSERT INTO organizations (name) VALUES ($1);`, [
      data.name,
    ]);
    return { success: true, value: null };
  } catch (error) {
    return handleError(error);
  } finally {
    client.release();
  }
}

// Edit the role of an existing user
export async function editUserRole(
  username: string,
  role: string,
): Promise<Result<null>> {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE users SET role = $1::organization_role WHERE username = $2;`,
      [role, username],
    );
    return { success: true, value: null };
  } catch (error) {
    return handleError(error);
  } finally {
    client.release();
  }
}

// Delete a user by username
export async function deleteUser(username: string): Promise<Result<null>> {
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM users WHERE username = $1;`, [username]);
    return { success: true, value: null };
  } catch (error) {
    return handleError(error);
  } finally {
    client.release();
  }
}

// Save multiple user assignments in bulk
export async function saveAllAssignments(updates: User[]): Promise<Result<null>> {
  const client = await pool.connect();

  try {
    const queryText = `
      UPDATE users
      SET org = v.org, role = v.role::organization_role
      FROM (VALUES 
        ${updates.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(",")}
      ) AS v(username, org, role)
      WHERE users.username = v.username;
    `;

    const userFields: string[] = updates.flatMap((user) => [
      user.username,
      user.org,
      user.role,
    ]);

    await client.query(queryText, userFields);
    return { success: true, value: null };
  } catch (error) {
    return handleError(error);
  } finally {
    client.release();
  }
}
