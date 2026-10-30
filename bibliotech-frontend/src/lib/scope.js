// The backend has no "my rentals" / "my fines" endpoints (GET /rentals and GET /fines
// return everything), so the UI narrows the lists to the signed-in user where the data
// allows it. When the data carries no owner information it says so instead of guessing.

export function belongsToUser(ownerId, user) {
  if (ownerId === undefined || ownerId === null || ownerId === '') return false;
  const o = String(ownerId).toLowerCase();
  return [user?.id, user?.username, user?.email].filter((v) => v != null).some((v) => String(v).toLowerCase() === o);
}

export function scopeRentals(rentals, user) {
  const known = rentals.some((r) => r.userId != null);
  if (!known) return { items: rentals, unknownOwner: true };
  return { items: rentals.filter((r) => belongsToUser(r.userId, user)), unknownOwner: false };
}

export function scopeFines(fines, myRentals, user, rentalsKnown) {
  if (fines.some((f) => f.userId != null)) {
    return { items: fines.filter((f) => belongsToUser(f.userId, user)), unknownOwner: false };
  }
  if (rentalsKnown) {
    const ids = new Set(myRentals.map((r) => String(r.id)));
    return { items: fines.filter((f) => ids.has(String(f.rentalId))), unknownOwner: false };
  }
  return { items: fines, unknownOwner: true };
}
