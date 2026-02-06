
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query, mapToCamelCase } from '../lib/db_connect';
import { createAuthenticatedClient } from '../lib/supabase';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH,DELETE');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') return response.status(200).end();

  // Verify Auth
  const supabase = createAuthenticatedClient(request.headers.authorization);
  if (!supabase) return response.status(500).json({ error: 'Database service unavailable' });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return response.status(401).json({ error: 'Unauthorized' });

  try {
    if (request.method === 'GET') {
      const { institutionId } = request.query;
      const id = Array.isArray(institutionId) ? institutionId[0] : institutionId;

      const sql = id
        ? 'SELECT * FROM allocation_requests WHERE institution_id = $1 ORDER BY timestamp DESC'
        : 'SELECT * FROM allocation_requests ORDER BY timestamp DESC';
      const params = id ? [id] : [];

      const res = await query(sql, params);

      const data = mapToCamelCase(res.rows).map((row: any) => {
        let prefs = {};
        let proposed = null;
        try {
          if (typeof row.preferences === 'string') prefs = JSON.parse(row.preferences);
          else if (typeof row.preferences === 'object') prefs = row.preferences;

          if (typeof row.proposed_changes === 'string') proposed = JSON.parse(row.proposed_changes);
          else if (typeof row.proposed_changes === 'object') proposed = row.proposed_changes;
        } catch (e) { }

        return {
          ...row,
          id: String(row.id),
          preferences: prefs,
          proposedChanges: proposed,
          courseLevelIds: (prefs as any)?.courseLevelIds || []
        };
      });

      return response.status(200).json(data);
    }

    if (request.method === 'POST') {
      const {
        subjectId, lecturerId, institutionId, status,
        priority, justification, academicYearId, semesterId, preferences, signatureUrl, proposedChanges
      } = request.body;

      if (!subjectId || !lecturerId || !institutionId) {
        return response.status(400).json({ error: "Missing required fields" });
      }

      await query(`
        INSERT INTO allocation_requests (
          subject_id, lecturer_id, institution_id, status, 
          priority, justification, academic_year_id, semester_id, preferences, signature_url, proposed_changes, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      `, [
        subjectId, lecturerId, institutionId, status || 'pending',
        priority || 'Medium', justification || '', academicYearId || null,
        semesterId || null, JSON.stringify(preferences || {}), signatureUrl || null,
        proposedChanges ? JSON.stringify(proposedChanges) : null
      ]);
      return response.status(201).json({ success: true });
    }

    if (request.method === 'PATCH') {
      const { requestId, status, justification, priority, proposedChanges, courseLevelIds } = request.body;
      if (!requestId) return response.status(400).json({ error: "requestId is required" });

      const currentRes = await query('SELECT * FROM allocation_requests WHERE id = $1', [requestId]);
      const rows = currentRes.rows as any[];

      if (rows.length === 0) return response.status(404).json({ error: "Request not found" });
      const current = rows[0];

      let finalPriority = priority || current.priority;
      let finalJustification = justification || current.justification;
      let finalProposed = current.proposed_changes;
      let finalCourseLevels = courseLevelIds || current.course_level_ids;

      if (proposedChanges !== undefined) {
        finalProposed = proposedChanges ? JSON.stringify(proposedChanges) : null;
      }

      // --- LOGIC: Apply Modification (Approval) ---
      // If status is becoming approved, and it was previously a change request,
      // we merge the proposed changes into the main record and clear the proposed field.
      if (current.status === 'change_request_pending' && status === 'approved') {
        let proposed: any = null;
        try {
          proposed = typeof current.proposed_changes === 'string' ? JSON.parse(current.proposed_changes) : current.proposed_changes;
        } catch (e) { }

        if (proposed) {
          finalPriority = proposed.priority || finalPriority;
          finalJustification = proposed.justification || finalJustification;
          // Clear the proposal now that it is applied
          finalProposed = null;
        }
      }

      // --- LOGIC: Reject Modification ---
      // If explicit null is sent for proposedChanges (via onUpdateRequest from frontend),
      // it means we are clearing the proposal (Rejection of change) but keeping the status as approved (original state).
      if (request.body.proposedChanges === null) {
        finalProposed = null;
      }

      await query(`
        UPDATE allocation_requests 
        SET 
          status = COALESCE($1, status), 
          justification = $2, 
          priority = $3,
          proposed_changes = $4,
          course_level_ids = $5,
          timestamp = CURRENT_TIMESTAMP
        WHERE id = $6
      `, [status || null, finalJustification, finalPriority, finalProposed, finalCourseLevels, requestId]);

      return response.status(200).json({ success: true });
    }

    if (request.method === 'DELETE') {
      const { id } = request.query;
      const reqId = Array.isArray(id) ? id[0] : id;
      if (!reqId) return response.status(400).json({ error: "Request ID is required" });

      await query('DELETE FROM allocation_requests WHERE id = $1', [reqId]);
      return response.status(200).json({ success: true });
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error (allocations):', error);
    return response.status(500).json({ error: error.message });
  }
}
