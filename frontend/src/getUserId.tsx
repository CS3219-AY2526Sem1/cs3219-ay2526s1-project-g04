import { jwtDecode } from 'jwt-decode';

export const getUserId = () => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    const decodedToken = jwtDecode<any>(token);
    if (decodedToken.userId === 'cmhm9n6e40000po63j3cn45fp') return 1;
    else return 2;
  }
  return 3;
};
