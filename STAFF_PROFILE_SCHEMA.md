# Staff profile fields (Firestore `staff/{uid}`)

প্রত্যেক কর্মীর ড্যাশবোর্ডে নাম, পদবি, ছবি, কোম্পানি আইডি ও ইউনিফর্ম দেখাতে নিচের ফিল্ডগুলো ব্যবহার করুন:

```js
{
  name: "Rakib Hasan",
  role: "support",
  designation: "Senior Customer Care Executive",
  department: "Customer Experience",
  workspaceName: "Customer Care Center",
  employeeId: "GS-CCE-0007",
  photoURL: "https://.../rakib.webp",
  uniform: "Golapi Customer Care Uniform",
  branchName: "Noakhali Sadar Branch",
  branchZone: "noakhali-sadar",
  phone: "01XXXXXXXXX",
  active: true
}
```

Supported current roles:
- `admin`
- `zone_manager`
- `inventory_manager`
- `finance`
- `support`
- `driver`

ফিল্ড না থাকলে সিস্টেম role অনুযায়ী নিরাপদ default নাম/পদবি/Workspace/ID দেখাবে।
