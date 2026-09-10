import { getUser } from '../lib/auth';
import Lobby from './quiz';
export const dynamic = 'force-dynamic';
export default async function Home() {
 const user = await getUser();
 return <Lobby user={user ? {name:user.username} : null} signInUrl='/signin' />;
}
