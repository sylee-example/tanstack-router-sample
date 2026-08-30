import type { User } from '@/entities/user/model/types';

const USERS: User[] = [
  { id: 'u-1', name: '김서연', email: 'seoyeon@example.com', department: '플랫폼', active: true },
  { id: 'u-2', name: '박도윤', email: 'doyun@example.com', department: '플랫폼', active: true },
  { id: 'u-3', name: '이하준', email: 'hajun@example.com', department: '결제', active: false },
  { id: 'u-4', name: '최지우', email: 'jiwoo@example.com', department: '결제', active: true },
  { id: 'u-5', name: '정민재', email: 'minjae@example.com', department: '데이터', active: true },
  { id: 'u-6', name: '한소율', email: 'soyul@example.com', department: '데이터', active: false },
];

/** 네트워크가 있는 것처럼 보이게 하는 지연. 로더가 실제로 먼저 도는지 눈으로 확인하려는 용도다 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchUsers = async (): Promise<User[]> => {
  await delay(150);
  return USERS;
};

export const fetchUser = async (id: string): Promise<User> => {
  await delay(150);
  const user = USERS.find((candidate) => candidate.id === id);
  if (!user) throw new Error('사용자를 찾을 수 없습니다');
  return user;
};
