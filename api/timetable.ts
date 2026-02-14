
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query, mapToCamelCase } from '../lib/db_connect';
import { createServerClient } from '../lib/supabase';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') return response.status(200).end();

  // Verify Auth
  const supabase = createServerClient(request.headers.authorization);
  if (!supabase) return response.status(500).json({ error: 'Database service unavailable' });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return response.status(401).json({ error: 'Unauthorized' });

  try {
    // GET: Load timetable for a specific semester
    if (request.method === 'GET') {
      const { institutionId, semesterId } = request.query;
      if (!institutionId) return response.status(400).json({ error: "Institution ID required" });

      let sql = 'SELECT * FROM timetable_entries WHERE institution_id = $1';
      let params = [institutionId];

      if (semesterId) {
        sql += ' AND semester_id = $2';
        params.push(semesterId as string);
      }

      const res = await query(sql, params);
      return response.status(200).json(mapToCamelCase(res.rows));
    }

    // POST: Save generated timetable (Bulk Insert)
    if (request.method === 'POST') {
      const { entries, institutionId, academicYearId, semesterId } = request.body;

      if (!entries || !Array.isArray(entries) || !institutionId || !semesterId) {
        return response.status(400).json({ error: "Invalid payload" });
      }

      // 1. Clear existing entries for this semester to avoid duplicates/stale data
      await query('DELETE FROM timetable_entries WHERE institution_id = $1 AND semester_id = $2', [institutionId, semesterId]);

      // 2. Bulk Insert
      if (entries.length > 0) {
        const values: any[] = [];
        const placeholders: string[] = [];

        entries.forEach((e: any, index: number) => {
          const i = index * 10;
          placeholders.push(`($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6}, $${i + 7}, $${i + 8}, $${i + 9}, $${i + 10})`);
          values.push(
            e.id,
            e.day,
            e.startTime,
            e.endTime,
            e.subjectId,
            e.lecturerId,
            e.roomId,
            institutionId,
            academicYearId,
            semesterId
          );
        });

        const sql = `
            INSERT INTO timetable_entries (
                id, day, start_time, end_time, subject_id, lecturer_id, room_id, 
                institution_id, academic_year_id, semester_id
            ) VALUES ${placeholders.join(', ')}
          `;

        await query(sql, values);
      }

      return response.status(201).json({ success: true, count: entries.length });
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error (timetable):', error);
    return response.status(500).json({ error: error.message });
  }
}
