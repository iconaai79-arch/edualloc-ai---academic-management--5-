# Boarding Management Module - Implementation Plan

## Overview
A comprehensive module for primary and secondary institutions to manage boarding facilities, including houses, beds, student allocations, and check-in/check-out tracking. The Boarding Master role will have full control over this module.

## Features

### 1. House Management
- Create and manage boarding houses (dormitories)
- Configure house details:
  - House name
  - Gender (Boys/Girls/Mixed)
  - Capacity
  - House master/matron assignment
  - Status (Active/Inactive/Under Maintenance)
  - Floor plans (optional)

### 2. Room & Bed Management
- Create rooms within houses
- Configure room details:
  - Room number/name
  - Room type (Single, Double, Dormitory)
  - Bed capacity
  - Floor level
  - Amenities
- Manage individual beds:
  - Bed number/identifier
  - Bed status (Available, Occupied, Reserved, Under Maintenance)
  - Bed condition tracking

### 3. Bed Allocation
- Allocate beds to boarding students
- Allocation criteria:
  - Gender matching
  - Class/grade grouping
  - Special needs accommodation
  - Sibling proximity (optional)
- Bulk allocation tools
- Allocation history tracking
- Transfer students between beds/rooms

### 4. Check-In/Check-Out Management
- Student check-in process:
  - Record check-in date/time
  - Verify bed allocation
  - Condition assessment
  - Personal items inventory (optional)
- Student check-out process:
  - Record check-out date/time
  - Room condition check
  - Damage/issue reporting
  - Clearance status
- Term-based check-in/check-out
- Weekend/holiday tracking

### 5. Boarding Master Dashboard
- Overview statistics:
  - Total houses, rooms, beds
  - Occupancy rates
  - Available beds
  - Students checked in/out
- Quick actions
- Recent activities
- Alerts and notifications

### 6. Reporting & Analytics
- Occupancy reports
- Allocation reports
- Check-in/check-out logs
- Maintenance tracking
- Student boarding history

## Database Schema

### Tables to Create:

1. **boarding_houses**
   - id, institution_id, name, gender, capacity, house_master_id, status, floor_plan_url, created_at

2. **boarding_rooms**
   - id, house_id, room_number, room_type, capacity, floor_level, amenities, status, created_at

3. **boarding_beds**
   - id, room_id, bed_number, status, condition, notes, created_at

4. **bed_allocations**
   - id, bed_id, student_id, allocated_by, allocation_date, term, academic_year, status, notes, created_at

5. **boarding_checkins**
   - id, allocation_id, student_id, check_in_date, check_in_time, checked_in_by, condition_notes, items_inventory, created_at

6. **boarding_checkouts**
   - id, allocation_id, student_id, check_out_date, check_out_time, checked_out_by, condition_notes, damage_report, clearance_status, created_at

## User Roles

### Boarding Master
- Full access to all boarding management features
- Can create/edit houses, rooms, and beds
- Can allocate/deallocate beds
- Can perform check-ins/check-outs
- Can view all reports
- Can manage house masters/matrons

### House Master/Matron
- View assigned house details
- Perform check-ins/check-outs for their house
- Report maintenance issues
- View house-specific reports

### Admin
- Can assign Boarding Master role
- Can view boarding reports
- Can configure boarding settings

## UI Components

### 1. BoardingMasterView.tsx
- Main dashboard for boarding master
- Navigation to all boarding features

### 2. HouseManager.tsx
- List, create, edit, delete houses
- View house details and occupancy

### 3. RoomBedManager.tsx
- Manage rooms and beds within a house
- Visual room layout (optional)

### 4. BedAllocationManager.tsx
- Allocate beds to students
- Bulk allocation tools
- Transfer students

### 5. CheckInOutManager.tsx
- Check-in/check-out interface
- Search students
- Record condition and notes

### 6. BoardingReports.tsx
- Various reports and analytics
- Export functionality

## Implementation Steps

### Phase 1: Database Setup
1. Create migration SQL file
2. Define TypeScript types
3. Set up Supabase tables

### Phase 2: Core Components
1. Create BoardingMasterView
2. Implement HouseManager
3. Implement RoomBedManager

### Phase 3: Allocation System
1. Create BedAllocationManager
2. Implement allocation logic
3. Add validation rules

### Phase 4: Check-In/Out System
1. Create CheckInOutManager
2. Implement check-in flow
3. Implement check-out flow

### Phase 5: Reporting
1. Create BoardingReports
2. Add analytics
3. Export functionality

### Phase 6: Integration
1. Add boarding master role to user management
2. Integrate with student records
3. Add navigation and permissions

## Technical Considerations

- **Validation**: Ensure gender matching, capacity limits
- **Concurrency**: Handle simultaneous allocations
- **History**: Track all changes for audit trail
- **Notifications**: Alert boarding master of issues
- **Mobile**: Consider mobile-friendly check-in/out
- **Offline**: Consider offline capability for check-ins

## Success Metrics

- Easy bed allocation process
- Quick check-in/check-out
- Clear occupancy visibility
- Accurate reporting
- Minimal manual tracking needed

---

**Ready to implement!** Let's start with Phase 1: Database Setup
