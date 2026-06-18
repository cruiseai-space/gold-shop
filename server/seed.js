import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import Decimal from 'decimal.js';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function getRandomDate() {
  const end = new Date();
  const start = new Date(end.getTime() - 60 * 24 * 60 * 60 * 1000); // Last 60 days
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seed() {
  console.log('Seeding data...');
  
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id').limit(1);
  if (pErr || !profiles.length) {
    console.error('No profiles found to use as creator.');
    return;
  }
  const creatorId = profiles[0].id;

  const memberNames = ['Ramesh Jewellers', 'Shakti Gold', 'Manoj Sharma', 'Anita Desai', 'Kiran Exports', 'Vikas Trading', 'Lakshmi Ornaments', 'Priya Singh', 'Suresh Kumar', 'Golden Touch'];
  const newMembers = memberNames.map(name => ({
    name,
    phone: `98${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    notes: 'Auto-generated seed data'
  }));

  const { data: members, error: mErr } = await supabase.from('members').insert(newMembers).select();
  if (mErr) {
    console.error('Error inserting members:', mErr);
    return;
  }
  console.log(`Inserted ${members.length} members.`);

  const purchases = [];
  for (let i = 0; i < 60; i++) {
    const member = members[Math.floor(Math.random() * members.length)];
    const type = Math.random() > 0.4 ? 'BUYING' : 'SELLING';
    
    const grossWeight = new Decimal(Math.random() * 100 + 5).toDecimalPlaces(4).toNumber();
    const touchPercent = new Decimal(Math.random() * 30 + 70).toDecimalPlaces(4).toNumber();
    const marketRate = Math.floor(Math.random() * 1000 + 6000);
    
    const pureWeight = new Decimal(grossWeight).times(touchPercent).dividedBy(100).toDecimalPlaces(4);
    const pureValue = pureWeight.times(marketRate).toDecimalPlaces(4);
    
    let cashGiven = 0;
    if (Math.random() > 0.2) {
      cashGiven = Math.floor(pureValue.toNumber() * (Math.random() * 0.8)); // partial payment
    }
    if (Math.random() > 0.8) {
      cashGiven = Math.floor(pureValue.toNumber()); // full payment
    }
    
    const pendingAmount = pureValue.minus(cashGiven).toDecimalPlaces(4).toNumber();

    purchases.push({
      member_id: member.id,
      transaction_type: type,
      gross_weight: grossWeight,
      touch_percent: touchPercent,
      pure_weight: pureWeight.toNumber(),
      market_rate: marketRate,
      pure_value: pureValue.toNumber(),
      cash_given: cashGiven,
      pending_amount: pendingAmount,
      created_by: creatorId,
      purchase_date: getRandomDate().toISOString(),
      cash_source: Math.random() > 0.5 ? 'Bank' : 'Safe',
      notes: 'Seed purchase'
    });
  }

  const { error: purErr } = await supabase.from('purchases').insert(purchases);
  if (purErr) {
    console.error('Error inserting purchases:', purErr);
  } else {
    console.log(`Inserted ${purchases.length} purchases.`);
  }

  console.log('Seed complete!');
}

seed();
