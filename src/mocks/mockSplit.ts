import { Participant, SplitBill } from '@/types/cart';

/**
 * Calculate even split among participants
 */
export function calculateEvenSplit(
  total: number,
  participants: Participant[]
): Record<string, number> {
  if (participants.length === 0) {
    return {};
  }

  const perPersonAmount = total / participants.length;
  const shares: Record<string, number> = {};

  participants.forEach((participant) => {
    shares[participant.id] = parseFloat(perPersonAmount.toFixed(2));
  });

  // Adjust for rounding errors - add any difference to first participant
  const calculatedTotal = Object.values(shares).reduce((sum, val) => sum + val, 0);
  const difference = parseFloat((total - calculatedTotal).toFixed(2));
  
  if (difference !== 0 && participants.length > 0) {
    shares[participants[0].id] = parseFloat(
      (shares[participants[0].id] + difference).toFixed(2)
    );
  }

  return shares;
}

/**
 * Validate that split shares equal the total
 */
export function validateSplit(
  shares: Record<string, number>,
  total: number,
  tolerance: number = 0.01
): boolean {
  const sum = Object.values(shares).reduce((acc, val) => acc + val, 0);
  return Math.abs(sum - total) < tolerance;
}

/**
 * Create a custom split with manual amounts
 */
export function createCustomSplit(
  participants: Participant[],
  amounts: Record<string, number>
): Record<string, number> {
  const shares: Record<string, number> = {};

  participants.forEach((participant) => {
    shares[participant.id] = amounts[participant.id] || 0;
  });

  return shares;
}

/**
 * Generate a mock participant with random name and avatar color
 */
const MOCK_NAMES = [
  'Angela',
  'Michael',
  'Sarah',
  'David',
  'Emma',
  'James',
  'Olivia',
  'William',
  'Sophia',
  'Benjamin',
];

const AVATAR_COLORS = [
  '#FED7AA', // orange-200
  '#BFDBFE', // blue-200
  '#BBF7D0', // green-200
  '#FBCFE8', // pink-200
  '#DDD6FE', // purple-200
  '#FEF08A', // yellow-200
  '#FCA5A5', // red-200
  '#A5F3FC', // cyan-200
];

export function generateMockParticipant(
  existingParticipants: Participant[]
): Participant {
  const usedNames = new Set(existingParticipants.map((p) => p.name));
  const availableNames = MOCK_NAMES.filter((name) => !usedNames.has(name));

  const name =
    availableNames.length > 0
      ? availableNames[Math.floor(Math.random() * availableNames.length)]
      : `Guest ${existingParticipants.length + 1}`;

  const avatar =
    AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  return {
    id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    avatar,
    isMock: true,
  };
}

/**
 * Add a participant to the split
 */
export function addParticipant(
  split: SplitBill,
  participant: Participant,
  total: number
): SplitBill {
  const updatedParticipants = [...split.participants, participant];
  
  let updatedShares: Record<string, number>;
  
  if (split.mode === 'even') {
    updatedShares = calculateEvenSplit(total, updatedParticipants);
  } else {
    updatedShares = { ...split.shares, [participant.id]: 0 };
  }

  return {
    ...split,
    participants: updatedParticipants,
    shares: updatedShares,
    isValid: validateSplit(updatedShares, total),
  };
}

/**
 * Remove a participant from the split
 */
export function removeParticipant(
  split: SplitBill,
  participantId: string,
  total: number
): SplitBill {
  const updatedParticipants = split.participants.filter(
    (p) => p.id !== participantId
  );

  const updatedShares = { ...split.shares };
  delete updatedShares[participantId];

  if (split.mode === 'even' && updatedParticipants.length > 0) {
    Object.assign(updatedShares, calculateEvenSplit(total, updatedParticipants));
  }

  return {
    ...split,
    participants: updatedParticipants,
    shares: updatedShares,
    isValid: validateSplit(updatedShares, total),
  };
}

/**
 * Update share for a participant in custom mode
 */
export function updateParticipantShare(
  split: SplitBill,
  participantId: string,
  amount: number,
  total: number
): SplitBill {
  const updatedShares = {
    ...split.shares,
    [participantId]: parseFloat(amount.toFixed(2)),
  };

  return {
    ...split,
    shares: updatedShares,
    isValid: validateSplit(updatedShares, total),
  };
}

/**
 * Change split mode and recalculate shares
 */
export function changeSplitMode(
  split: SplitBill,
  mode: SplitBill['mode'],
  total: number
): SplitBill {
  let updatedShares = split.shares;

  if (mode === 'even') {
    updatedShares = calculateEvenSplit(total, split.participants);
  } else if (mode === 'all') {
    // Pay for everyone - assign full amount to first participant
    updatedShares = {};
    if (split.participants.length > 0) {
      updatedShares[split.participants[0].id] = total;
    }
  } else if (mode === 'self') {
    // Pay for self - assign full amount to first participant (current user)
    updatedShares = {};
    if (split.participants.length > 0) {
      updatedShares[split.participants[0].id] = total;
    }
  }

  return {
    ...split,
    mode,
    shares: updatedShares,
    isValid: validateSplit(updatedShares, total),
  };
}

/**
 * Create initial split bill
 */
export function createInitialSplit(
  currentUser: Participant,
  total: number
): SplitBill {
  return {
    mode: 'even',
    participants: [currentUser],
    shares: { [currentUser.id]: total },
    isValid: true,
  };
}
