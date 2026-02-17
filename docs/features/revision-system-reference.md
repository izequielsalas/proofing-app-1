# Proof Revision System - Quick Reference Guide

**Last Updated:** February 16, 2026  
**Status:** ✅ Deployed to Production  
**Live URL:** https://proofingapp1.web.app

---

## 🎯 What is the Revision System?

The revision system allows designers and admins to upload new versions of declined proofs while maintaining a complete audit trail. Clients can view the full history of all revisions and their feedback.

---

## 👥 User Workflows

### For Clients

1. **Receive notification** that a proof is ready
2. **Review the proof** in the dashboard
3. **Approve or decline** with feedback comments
4. If declined, wait for designer to upload revision
5. **Receive notification** when revision is ready
6. **Review revision** (marked with v2, v3, etc. badge)
7. **View revision history** to see all previous versions and feedback
8. **Approve final version**

### For Designers/Admins

1. **Receive notification** when client declines a proof
2. **Open the declined proof** in the Modal
3. **Click "Upload Revision"** button (appears for declined proofs only)
4. **Upload new file** with revision notes
5. System automatically:
   - Increments version number (v2, v3, etc.)
   - Links to parent proof
   - Notifies client
6. **Track revision history** to see all feedback and versions

---

## 🔍 Visual Indicators

### Proof Cards (Dashboard Grid)
- **Blue badge with GitBranch icon:** Shows "v2", "v3", etc. for revisions
- **Status badge:** Green (Approved), Red (Declined), Yellow (Pending)
- Both badges appear together on revision cards

### Modal (Proof Detail View)
- **Revision badge in header:** Shows "Revision 2", "Revision 3", etc.
- **"Show Revision History" button:** Expands to show all previous versions
- **Amber warning box:** Appears for declined proofs with "Upload Revision" button
- **Blue revision mode banner:** Appears during revision upload

---

## 📊 Data Structure

### Firestore Fields (in `proofs` collection)

```javascript
{
  // Standard proof fields
  title: "Project Name",
  clientId: "user123",
  clientName: "John Doe",
  status: "pending" | "approved" | "declined",
  fileUrl: "https://...",
  
  // Revision tracking fields
  parentProofId: null | "parent_proof_id",  // null = original proof
  revisionNumber: 1,  // 1, 2, 3, etc.
  revisionChainId: "chain_id",  // shared across all versions
  
  // Other fields
  createdAt: timestamp,
  updatedAt: timestamp,
  comments: "Client feedback here",
  notes: "Designer notes here"
}
```

### Revision Chain Example

```
Original Proof (v1)
├── parentProofId: null
├── revisionNumber: 1
└── revisionChainId: "abc123"  (its own ID)

Revision 2 (after v1 declined)
├── parentProofId: "abc123"  (v1's ID)
├── revisionNumber: 2
└── revisionChainId: "abc123"  (same as v1)

Revision 3 (after v2 declined)
├── parentProofId: "xyz789"  (v2's ID)
├── revisionNumber: 3
└── revisionChainId: "abc123"  (same as v1 and v2)
```

---

## 🔐 Permissions

| Action | Client | Designer | Admin |
|--------|--------|----------|-------|
| View own proofs | ✅ | ✅ | ✅ |
| View all proofs | ❌ | Assigned only | ✅ |
| Upload new proof | ❌ | ✅ | ✅ |
| Upload revision | ❌ | ✅ | ✅ |
| View revision history | ✅ | ✅ | ✅ |
| Approve/Decline | ✅ (own) | ❌ | ✅ |

### Firestore Security Rules

The rules allow clients to:
- Read proofs where `clientId` matches their UID
- Read other proofs in the same revision chain (via `revisionChainId`)
- Update only `status` and `comments` fields on their proofs

Designers can:
- Upload new proofs and revisions
- Read proofs they uploaded or are assigned to
- Update metadata (not status/comments)

---

## 🔧 Technical Implementation

### Components Modified

1. **WorkItem.jsx**
   - Added revision badge display
   - Props: `revisionNumber`, `parentProofId`

2. **ProofGrid.jsx**
   - Passes revision data to WorkItem
   - No filtering (shows all revisions)

3. **Modal.jsx**
   - Revision history display (collapsible)
   - "Upload Revision" button for declined proofs
   - Embeds UploadProof component in revision mode

4. **uploadProof.jsx**
   - Revision mode support via props
   - Pre-fills form with parent proof data
   - Single-file restriction for revisions
   - Auto-links to parent and increments version

### Firestore Index Required

**Composite Index:**
- Collection: `proofs`
- Fields:
  1. `revisionChainId` (Ascending)
  2. `revisionNumber` (Descending)

**Status:** ✅ Created and Enabled

---

## 🐛 Troubleshooting

### Issue: Revision history shows "No previous revisions"

**Causes:**
1. Firestore index not built yet (wait 2-3 minutes)
2. Client doesn't have permission (check security rules)
3. `revisionChainId` not set on proofs

**Fix:**
- Check Firestore console for index status
- Verify security rules include revision chain access
- Check proof document has `revisionChainId` field

### Issue: "Upload Revision" button doesn't appear

**Causes:**
1. Proof status is not "declined"
2. User doesn't have upload permissions
3. Not logged in as admin/designer

**Fix:**
- Only appears for declined proofs
- Must be admin or designer role
- Check `hasPermission('canUploadProofs')` returns true

### Issue: Revision uploads as separate proof (not linked)

**Causes:**
1. `revisionMode` prop not passed to UploadProof
2. `parentProof` prop missing or null
3. Modal not embedding UploadProof correctly

**Fix:**
- Verify Modal passes `revisionMode={true}`
- Verify Modal passes `parentProof={project}`
- Check console for debug logs showing revision fields

### Issue: Client gets email for failed upload

**Cause:**
- Email sent before upload completes
- Not wrapped in try/catch properly

**Fix:**
- Move email notification after successful upload
- Already working - just an edge case if upload fails mid-process

---

## 📈 Usage Statistics

Track these metrics in Firebase Analytics (future):
- Average revisions per proof
- Time between revision uploads
- Client approval rate by revision number
- Most common decline reasons

---

## 🚀 Future Enhancements

### Potential Features (Not Yet Implemented)

1. **Side-by-Side Comparison**
   - View current vs previous version
   - Image diff highlighting
   - Slider/toggle between versions

2. **Revision Grouping**
   - Dashboard option to "Show only latest versions"
   - Expandable groups for revision chains
   - Collapse older approved chains

3. **Comment Threading**
   - Conversation thread across revisions
   - @mentions for team members
   - Reply to specific comments

4. **Auto-Archive**
   - Move approved revision chains to archive
   - Keep dashboard clean
   - Searchable archive

5. **Analytics Dashboard**
   - Average revisions per client
   - Designer performance metrics
   - Decline reason categorization

6. **Bulk Operations**
   - Upload multiple revisions at once
   - Batch approve/decline
   - CSV export of revision history

7. **Version Comparison API**
   - Programmatic diff between versions
   - Integration with design tools
   - Automated change detection

---

## 📝 Best Practices

### For Designers

1. **Always add revision notes** - Explain what changed
2. **Reference original feedback** - Show you addressed concerns
3. **Upload high-quality files** - Avoid multiple re-revisions
4. **Respond quickly** - Set expectations with clients
5. **Use consistent naming** - Keep project titles the same across revisions

### For Clients

1. **Be specific in decline feedback** - "Change logo to blue" not just "needs work"
2. **Review revision history** - See what's already been tried
3. **Approve when satisfied** - Don't request unnecessary changes
4. **Check all versions** - Compare current to original if needed

### For Admins

1. **Monitor revision counts** - High numbers may indicate scope creep
2. **Track common issues** - Train designers on frequent problems
3. **Set revision limits** - Consider charging for 4+ revisions
4. **Archive old chains** - Keep database performant

---

## 🎓 Training Your Team

### Onboarding Checklist

**For New Designers:**
- [ ] Explain revision workflow
- [ ] Show how to upload revisions
- [ ] Demonstrate revision history view
- [ ] Practice with test client
- [ ] Review best practices

**For New Clients:**
- [ ] Show how to approve/decline
- [ ] Explain revision process
- [ ] Demonstrate history viewing
- [ ] Set expectations on turnaround time
- [ ] Provide feedback examples

---

## 📞 Support

### Common Questions

**Q: How many revisions can a proof have?**  
A: Unlimited, but typically 1-3 revisions is normal. More than 5 may indicate scope issues.

**Q: Can clients upload revisions?**  
A: No, only designers and admins can upload revisions. Clients can only approve/decline.

**Q: What happens to old versions?**  
A: They're preserved in the revision history. Files remain in Firebase Storage.

**Q: Can we delete old revisions?**  
A: Admins can delete individual proofs, but it breaks the revision chain. Not recommended.

**Q: Do clients get notified of revisions?**  
A: Yes, automatic email notifications are sent when revisions are uploaded (via existing email system).

---

## 🔒 Security Notes

- All revision queries respect client isolation
- Clients can only see revisions of their assigned proofs
- File URLs are protected by Firebase Storage rules
- Audit trail is immutable (updates create new versions)

---

## 💾 Backup & Recovery

### Database Backup
- Firestore automatic backups enabled
- All proof documents include revision metadata
- Files stored in Firebase Storage with redundancy

### Recovery Scenarios

**Lost revision chain:**
- Query by `revisionChainId` to find all versions
- Manually reconstruct if needed

**Accidental deletion:**
- Check Firestore backups
- Restore from daily snapshots
- Contact Firebase support for point-in-time recovery

---

## 📊 Performance Considerations

### Current Scale
- Index supports unlimited revisions per chain
- Dashboard shows all revisions (may need pagination at high volume)
- History query limited by Firestore (no performance issues expected up to 100+ revisions)

### Optimization Tips
- Consider pagination if >500 proofs in dashboard
- Archive completed revision chains periodically
- Implement lazy-loading for revision history if chains exceed 20 versions

---

## ✅ Deployment Checklist

When deploying to new environment:

- [ ] Copy 4 JSX component files
- [ ] Update Firestore security rules
- [ ] Create composite index for `revisionChainId` + `revisionNumber`
- [ ] Test full workflow (upload → decline → revise → approve)
- [ ] Verify client permissions
- [ ] Check email notifications
- [ ] Test on mobile devices
- [ ] Train team on new features

---

## 🎉 Success Metrics

After 1 month of use, measure:
- ✅ Revision system usage (% of proofs with revisions)
- ✅ Average revisions per proof (target: <2)
- ✅ Client satisfaction with revision process
- ✅ Time saved vs. email-based revisions
- ✅ Reduction in miscommunication

---

**System Status:** ✅ Production Ready  
**Last Tested:** February 16, 2026  
**Version:** 1.0  

For questions or issues, refer to the main implementation guide or check the Firebase Console logs.
