# Improvments in Servica call intake

1. When a new customer is created, there is a new customer automatically loaded in the list
2. Courior name list in company service center parcel - Reliance, Trackon
3. Save button should be at the bottom
4. Remove print option
5. Send via whatsapp - terms and conditions should be automatically sent as well 
6. Add Date of purchase column in device details and bill number (This should only be for us not for customer whatsapp or print)
7. Once a part is added, this should be saved to item list and next time it should auto-fill
8. Backoffice staff should be a required field - for auditing purposes we need received by, sent by, given to customer by etc.
9. We need to maintain timeline with status. Which staff gave what, when, when was it sent, when was it received etc


# Prompt

Now .. let's make changes .. don't deploy until i say so
1. Customer Management & Typeahead Search

Instant Refresh: When a new customer is created, immediately make them selectable without requiring a manual page refresh.

Server-Side Typeahead: Replace standard dropdowns with an autocomplete/typeahead search field linked directly to Firestore (indexing customer names, phone numbers, and IDs) to handle 5,000+ customer records efficiently.

Schema Optimization: Structure Firestore customer documents with indexed search tokens/prefixes if needed to support fast querying.

2. Device Details & Catalog Auto-fill

Internal Tracking Fields: Add optional internal-only fields under Device Details: Date of Purchase (DOP) and Purchase Invoice / Bill Number. Exclude these fields from customer-facing WhatsApp updates.

Hierarchical Model Catalog: When a new model number is entered, persist it under its respective category. Implement typeahead search for model numbers categorized by device type.

Optional Spare Parts: Ensure the spare parts section supports zero-part intake records without validation errors.

Auto-saving Parts Catalog: Automatically save newly added spare parts to the master parts list for future auto-fill.

3. Timeline, Auditing & Back-Office Staff Tracking

Mandatory Back-Office Staff Assignment: Make "Handled By / Staff Member" a required field during intake and subsequent status updates (separated logically from technical repair staff).

Firestore Timeline Subcollection: Track lifecycle events with automatic timestamps, user ID, status changes, comments, and courier details (e.g., Reliance, Trackon).

Miscellaneous Comments: Provide a dedicated internal comments/notes field at the bottom of the service call screen.

4. WhatsApp Notifications & Terms

Formatted Status Updates: Send structured WhatsApp messages reflecting real-time stages (e.g., Intake Completed, In-Progress, Ready for Delivery).

Automated Terms & Conditions: Append standard service terms (courier liability, transit damage policies, inspection terms) sourced directly from the website template.

5. UI/UX Layout & Keyboard Shortcuts

Form Layout: Place the primary Save / Accept button fixed at the bottom. Remove the redundant Print button.

Global Keyboard Shortcuts:

Ctrl + A: Accept / Save current screen

Esc: Close current screen / modal

Ctrl + F2: Change Date

Timeline Event Hotkeys:

F5: Replacement Sent to Service Center

F6: Replacement Received from Service Center

F8: Replacement Product Given to Customer

F9: Replacement Product Received from Customer